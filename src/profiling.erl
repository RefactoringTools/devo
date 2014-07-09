-module(profiling).
-export([start_profiling/3, stop_profiling/2]).

start_profiling(rq, [Node|_], Pid) ->
    case rpc:call(Node, erlang, system_info, [cpu_topology]) of 
        {badrpc, Reason} ->
            io:format("Devo failed to start profiling for reason:\n~p\n",
                           [Reason]);
        Cpu ->
            handle_cpu(Cpu, Pid),
            Res=rpc:call(Node, devo_sampling, start,
                         [[run_queues], infinity, none, {devo, node()}]),
            case Res of 
                {badrpc, Reason} ->
                    io:format("Devo failed to start profiling for reason:\n~p\n",
                              [Reason]);
                _ -> Res
            end
    end;
start_profiling(migration, [Node|_],Pid) ->
    case rpc:call(Node, erlang, system_info, [cpu_topology]) of
        {badrpc, Reason} ->
            io:format("Devo failed to start profiling for reason:\n~p\n",
                      [Reason]);
        Cpu ->
            handle_cpu(Cpu, Pid),
            erlang:start_timer(1, Pid, <<"Online profiling started...!">>),
            devo_trace:start_trace(migration, Node, {devo, node()})
    end;
start_profiling(rq_migration, [Node|_],Pid) ->
    case rpc:call(Node, erlang, system_info, [cpu_topology]) of
        {badrpc, Reason} ->
            io:format("Devo failed to start profiling for reason:\n~p\n",
                      [Reason]);
        Cpu ->
            handle_cpu(Cpu,Pid),
            erlang:start_timer(1, Pid, <<"Online profiling started...!">>),
            Res=rpc:call(Node, devo_sampling, start,
                         [[run_queues], infinity, none,{devo, node()}]),
            case Res of 
                {badrpc, Reason} ->
                    io:format("Devo failed to start profiling for reason:\n~p\n",
                              [Reason]);
                _ -> 
                    devo_trace:start_trace(migration, Node, {devo, node()})
            end
    end;
start_profiling(inter_node, Nodes=[N|_Ns], Pid) ->
    case get_init_s_group_config(N) of 
        {badrpc, Reason} ->
            io:format("Devo failed to start profiling for reason:\n~p\n",
                      [Reason]);
        undefined ->
            Pid!{s_group_init_config, []},
            erlang:start_timer(1, Pid, <<"Online profiling started...!">>),
            devo_trace:start_trace(inter_node, Nodes, {devo, node()});
        {ok, NodeGrps} ->
            Pid!{s_group_init_config, NodeGrps},
            erlang:start_timer(1, Pid, <<"Online profiling started...!">>),
            devo_trace:start_trace(inter_node, Nodes, {devo, node()})            
    end;
start_profiling(s_group, Nodes=[N|_Ns], Pid) ->
    case get_init_s_group_config(N) of 
        {badrpc, Reason} ->
            io:format("Devo failed to start profiling for reason:\n~p\n",
                      [Reason]);
        undefined ->
            Pid!{s_group_init_config, []},
            devo_trace:start_trace(s_group, Nodes, {devo, node()});
        {ok, NodeGrps} ->
            Pid!{s_group_init_config, NodeGrps},
            devo_trace:start_trace(s_group, Nodes, {devo, node()})
    end;
start_profiling(Cmd, _Nodes, _Pid) ->
    io:format("start_profiling: unnexpected command:~p\n", [Cmd]),
    ok.

stop_profiling(rq, [Node|_]) ->
    Res=rpc:call(Node, devo_sampling, stop,[]),
    case Res of 
        {badrpc, Reason} ->
            io:format("Devo failed to stop profiling for reason:\n~p\n",
                      [Reason]);
        _ -> 
           Res
    end;
stop_profiling(message_queue_len, [Node|_]) ->
    Res=rpc:call(Node, devo_sampling, stop,[]),
    case Res of 
        {badrpc, Reason} ->
            io:format("Devo failed to stop profiling for reason:\n~p\n",
                      [Reason]);
        _ -> 
           Res
    end;

stop_profiling(migration, [_Node|_]) ->
    devo_trace:stop_trace();
stop_profiling(rq_migration, [Node|_]) ->
    Res=rpc:call(Node, devo_sampling, stop,[]),
    case Res of 
        {badrpc, Reason} ->
            io:format("Devo failed to stop profiling for reason:\n~p\n",
                      [Reason]);
        _ -> 
            Res
    end,
    erlang:start_timer(1, self(), stop_profile),
    devo_trace:stop_trace();
stop_profiling(inter_node, _Nodes) ->
    erlang:start_timer(1, self(), stop_profile),
    devo_trace:stop_trace();
stop_profiling(s_group, _Nodes) ->
    devo_trace:stop_trace();
stop_profiling(undefined,_) ->
    ok;
stop_profiling(Cmd, _Nodes) ->
    io:format("stop_profiling: unnexpected command:~p\n", [Cmd]),
    ok.

handle_cpu(undefined, Pid) ->
   Pid!{cpu, cpu(erlang:system_info(schedulers))};
handle_cpu(Cpu, Pid) ->
   Pid!{cpu, Cpu}.

get_init_s_group_config(Node) ->
    case rpc:call(Node, application, get_env, [kernel, s_groups]) of
        {badrpc, Reason} ->
            {badrpc, Reason};
        undefined ->
            {ok, []};
        {ok, NodeGrps} ->
            io:fwrite("~w~n", [NodeGrps]),
            Grps = [grp_tuple(NodeGrp)||NodeGrp<-NodeGrps],
            {ok,Grps}
    end.

grp_tuple({Name, Nodes}) ->
    {Name, Nodes};  
grp_tuple({Name, _, Nodes}) ->
    {Name, Nodes}.

%% fake cpu topology.
cpu(8)->
    {cpu,[{processor,[{core,[{thread,{logical,0}},{thread,{logical,1}}]},
                      {core,[{thread,{logical,2}},{thread,{logical,3}}]},
                      {core,[{thread,{logical,4}},{thread,{logical,5}}]},
                      {core,[{thread,{logical,6}},{thread,{logical,7}}]}]}]};
cpu(4) ->
    {cpu,[{processor,[{core,[{thread,{logical,0}},{thread,{logical,1}}]},
                      {core,[{thread,{logical,2}},{thread,{logical,3}}]}]}]};
cpu(2) ->
    {cpu,[{processor,[{core,[{thread,{logical,0}},{thread,{logical,1}}]}]}]};
cpu(_N) ->
    io:format("Warning: cpu_topology undefined!\n"),
    undefined.
