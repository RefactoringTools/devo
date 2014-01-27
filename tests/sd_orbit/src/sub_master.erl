%% sub-master for performing double hashing
%%
%% Author: Amir Ghaffari <Amir.Ghaffari@glasgow.ac.uk>
%%
%% RELEASE project (http://www.release-project.eu/)
%%

-module(sub_master).

-export([init/8, gateway/0,change_list/5]).


%% Initiates sub-master, gateway, and all worker processes inside the s_group
init(Gs, Xs, P, Timeout, Spawn, Credit, MasterID, GroupName)->
  case config:get_key(separate_node_for_submasters) of
	false ->
		process_flag(priority, high), %% set priority of gateway process to high
		Hosts= s_group:own_nodes(GroupName); %% get all worker nodes that this submaster node is responsible for
	_ ->
		AllHosts= s_group:own_nodes(GroupName), %% get all worker nodes that this submaster node is responsible for
		if
			length(AllHosts)>1 ->
				Hosts=lists:delete(node(),AllHosts); %% removes submaster node from the list of worker nodes
			true ->  %% there is just one node in the group
				Hosts=AllHosts 
		end
  end,
  io:format("Number of worker nodes in group ~p is: ~p \n",[GroupName, length(Hosts)]),
  receive 
	{start, Group_Hash_Table} -> %% Receives the group hash table from Master node
		FoundGroup=search_sub_group(self(), Group_Hash_Table),
		case FoundGroup of
		    {_Pid, Gateway, GroupStart, GroupSize} ->
		        ok;
		     _ -> Gateway=0, GroupStart=0, GroupSize=0,
				throw(group_not_found)
		end,
		ProcessTabSize=GroupSize div (length(Hosts)*P), %% find table size for each process
		WorkerTabSize2= GroupSize-(ProcessTabSize*length(Hosts)*P), %% find additional table size for the last worker node
		ProcessTabSize2=WorkerTabSize2 div P, %% find additional table size for the last node processes
          ProcessTabSize3=GroupSize-(ProcessTabSize*length(Hosts)*P)-(ProcessTabSize2*P), %% find additional table size for the last process on the last node
          Temp_Worker_Hash_Table=make_workers_hash_table(Hosts, P, ProcessTabSize),
          Temp_Worker_Hash_Table2=change_list(Temp_Worker_Hash_Table,P*(length(Hosts)-1)+1, P*length(Hosts)-1, 2, ProcessTabSize+ProcessTabSize2), %% increase the size of table for all processes on the last node		
          Worker_Hash_Table=change_list(Temp_Worker_Hash_Table2,P*length(Hosts), P*length(Hosts), 2, ProcessTabSize+ProcessTabSize2+ProcessTabSize3), %% increase the size of table for the last processes on the last node	
          {Workers, _GlobTabSize}=start_workers(Worker_Hash_Table,{[],GroupStart}),

          [{_, _, LastGroupStart, LastGroupSize}|_Tail] = Group_Hash_Table,
          
          [{_, FirstWorkerStart,_}|_Tail2]=lists:reverse(Workers),
          [{_, LastWorkerStart,LastWorkerSize}|_Tail3]=Workers,
          
          case GroupStart of
              FirstWorkerStart ->
                  ok;
              _ -> throw(group_start_and_first_process_start_not_equal)
          end,

          EndOfWorkersInGroup=LastWorkerStart+LastWorkerSize,
          case GroupStart+GroupSize of
              EndOfWorkersInGroup ->
                  ok;
              _ ->throw(group_is_not_divided_properly)
          end,
          
          StaticMachConf={Gs,self(),Gateway,Workers,LastGroupStart+LastGroupSize,Timeout,Spawn}, %% contains the process hash table for this s_group
          lists:foreach(fun({Pid,_,_}) -> Pid ! {init, StaticMachConf } end, Workers), %% process hash table is sent to all worker processes
          Gateway! {hash_table, StaticMachConf }, %% process hash table is sent to the gateway processes
          case Xs of
              [] -> ok;
              _ ->  
                                                % distribute initial vertices to workers
                  worker:distribute_vertices(StaticMachConf, Credit, Xs)
          end
  end,
    
    collect_credit(MasterID),
    % ask from all Workers to dump their tables
    lists:foreach(fun({Pid, _, _}) -> Pid ! {dump} end, Workers),
    collect_orbit(MasterID,length(Workers)).
%% s_group:delete_s_group(GroupName).

%% update elements of a list from (From) to (To) with value (Value)
change_list(Worker_Hash_Table, From, To, Element, Value) ->
	if
	  From>To ->
	    Worker_Hash_Table;
	  true ->
	    Temp=lists:nth(From,Worker_Hash_Table),
	    Updated=setelement(Element, Temp, Value),
	    NewWorker_Hash_Table=lists:sublist(Worker_Hash_Table,From-1) ++ [Updated] ++ lists:nthtail(From,Worker_Hash_Table),
	    change_list(NewWorker_Hash_Table, From+1, To, Element, Value)
	end.

%% makes the second level hash table for its own s_group
%% table is a list of tuples {HostName,ProcessTableSize}
make_workers_hash_table(Hosts,P,ProcessTableSize) ->
	Counter=P, %% runs P processes on each node
	do_make_workers_hash_table([],Counter,Hosts,P,ProcessTableSize).

do_make_workers_hash_table(Worker_Hash_Table,_Counter,[],_P,_ProcessTableSize) ->
	Worker_Hash_Table;

do_make_workers_hash_table(Worker_Hash_Table,0,[_Host|Remains],P,ProcessTableSize) ->
	do_make_workers_hash_table(Worker_Hash_Table,P,Remains,P,ProcessTableSize);

do_make_workers_hash_table(Worker_Hash_Table,Counter,[Host|Remains],P,ProcessTableSize) ->
	NewWorker_Hash_Table = [{Host,ProcessTableSize}|Worker_Hash_Table],
	do_make_workers_hash_table(NewWorker_Hash_Table,Counter-1,[Host|Remains],P,ProcessTableSize).

%% create a number of worker processes on the nodes inside the s_group and return a table
%% table is a list of tuples {process PID, process_start_from, process table size}
start_workers([], {Workers, GTabSize}) ->
	{Workers, GTabSize};

start_workers([{Node, TabSize} | Hosts], {Workers, GTabSize}) ->
	Pid = spawn_link(Node, worker, init, [TabSize]),
	NewWorkers = [{Pid, GTabSize, TabSize} | Workers],
	NewGTabSize = GTabSize+TabSize,
	start_workers(Hosts, {NewWorkers, NewGTabSize}).

%% when receives a credit return it back to the master node
collect_credit(MasterID) ->
	receive
	  {done, Credit} -> 
	    MasterID! {done, Credit},
	    collect_credit(MasterID);
	  {dump} ->
	    ok
	end.

%% collect_orbit collects partial orbits and stats from N workers.
collect_orbit(MasterID,N) ->
  {PartOrbits, WorkerStats} = do_collect_orbit(N, [], []),
  MasterID! {result, PartOrbits, WorkerStats}.

do_collect_orbit(0, PartOrbits, WorkerStats) -> {PartOrbits, WorkerStats};
do_collect_orbit(N, PartOrbits, WorkerStats) ->
  receive
    {result, PartOrbit, WorkerStat} ->
      do_collect_orbit(N - 1, [PartOrbit|PartOrbits], [WorkerStat|WorkerStats])
  end.

%% this is gateway process which is created on all sub-master nodes
gateway() ->
    %% io:format("Register sd_orbit:~p\n", [{self(), node()}]),
    Res=register(sd_orbit, self()),
   %% io:format("whereis sd_orbit:~p\n", [{Res, whereis(sd_orbit)}]),
  process_flag(priority, high), %% set priority of gateway process to high
  receive 
	{start, Group_Hash_Table} -> %% Receives the group hash table from Master node
		gateway(Group_Hash_Table)
  end.

%% gateway process receives the first level hash table in which range is divided among groups
gateway(Group_Hash_Table) ->
  receive 
	{hash_table, StaticMachConf} -> %% Hash table for worker processes inside own group
		do_gateway(Group_Hash_Table, StaticMachConf)
  end.

%% a loop that receives a pair of {X,Credit} and finds appropriate group for it
do_gateway(Group_Hash_Table, StaticMachConf) ->
  receive
    {X,K} ->
      GlobalTableSize = master:get_global_table_size(StaticMachConf),
      Hash = erlang:phash2(X), %% erlang:phash2(X) returns hash value for X
      GlobSlot = Hash rem GlobalTableSize,
      Gateway=find_gateway(Group_Hash_Table,GlobSlot),
      if
        Gateway==self() ->
          worker:send_vertex(StaticMachConf,X,K); %% X belongs to the current group
        Gateway==not_found_appropriate_gateway ->
			MasteID = master:get_master(StaticMachConf),
			MasteID! {print, {not_found_gateway,x,X,globSlot,GlobSlot}};
        true ->
          Gateway! {X,K} %% X belongs to another group
      end,
      do_gateway(Group_Hash_Table, StaticMachConf);
    {dump} ->
		ok
  end.

%% A recursive search in group hash table and returns an appropriate gateway process
find_gateway([{_,Getway,Start,_TabSize} | Group_Hash_Table],GlobSlot)->
  if
    GlobSlot >= Start ->
      Getway;
    true ->
      find_gateway(Group_Hash_Table,GlobSlot)
  end;

find_gateway([],_GlobSlot)->
  not_found_appropriate_gateway.

%% A recursive search for a specific gateway PID 
%% Group_Hash_Table=[{Pid, Gateway,GlobalSize, TabSize} | ...];
search_sub_group(Target_Pid, [Head|Group_Hash_Table]) ->
	{Pid, Gateway, GlobalSize, TabSize}=Head,
	case Pid of
		Target_Pid-> {Pid, Gateway, GlobalSize, TabSize};
		_ -> search_sub_group(Target_Pid, Group_Hash_Table)
	end;

search_sub_group( _Target_Pid, []) ->
	not_found_appropriate_group.

