%%
%% %CopyrightBegin%
%% 
%% Copyright Ericsson AB 2002-2011. All Rights Reserved.
%% 
%% The contents of this file are subject to the Erlang Public License,
%% Version 1.1, (the "License"); you may not use this file except in
%% compliance with the License. You should have received a copy of the
%% Erlang Public License along with this software. If not, it can be
%% retrieved online at http://www.erlang.org/.
%% 
%% Software distributed under the License is distributed on an "AS IS"
%% basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
%% the License for the specific language governing rights and limitations
%% under the License.
%% 
%% %CopyrightEnd%
%%
-module(devo_trace).

-compile(export_all).

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

start_trace(migration, Node, Receiver) ->
    {ok, _} = do_tracer([Node], Receiver),
    {ok, _} = devo_dbg:p(all, [procs, running, scheduler_id]);
start_trace(high_level, Nodes,Receiver) ->
    {ok, _} = do_tracer(Nodes, Receiver),
    {ok, _} = devo_dbg:p(all, [send]),
    {ok, _} = devo_dbg:p(all, [call]),
    {ok, _} = devo_dbg:tp({s_group, new_s_group, 2},[]),
    {ok, _} = devo_dbg:tp({s_group, delete_s_group, 1},[]),
    {ok, _} = devo_dbg:tp({s_group, add_nodes, 2},[]),
    {ok, _} = devo_dbg:tp({s_group, remove_nodes, 2},[]).
stop_trace() ->
    devo_dbg:stop_clear().

do_tracer(Clients, Receiver) ->
    Res=lists:foldl(
          fun(N, {Cs, S}) ->
                  Host = case N of
                             nonode@nohost ->
                                 {ok, H} = inet:gethostname(),
				 H;
                             _ ->
				 [_,H] = string:tokens(atom_to_list(N),"@"),
                                 H
                         end,
                  case catch devo_dbg:tracer(N,port,devo_dbg:trace_port(ip,0)) of
                      {ok,N} ->
                          {ok,Port} = devo_dbg:trace_port_control(N,get_listen_port),
                          {ok,_T} = devo_dbg:get_tracer(N),
                          devo_dbg:trace_client(ip, {Host,Port}, mk_trace_parser({N,Receiver})),
                          {[N|Cs], [N|S]};
                      Other ->
                          display_warning(N,{cannot_open_ip_trace_port,
                                             Host,
                                             Other}),
                          {Cs, S}
                  end             
          end, 
          {[],[]}, 
          Clients),
    {ok, Res}.
 
display_warning(Item,Warning) ->
    io:format("Warning: {~w,~w}~n",[Warning,Item]).

mk_trace_parser({Node, Receiver}) -> 
    {fun trace_parser/2, {Node, Receiver}}.

trace_parser({trace, From, send, Msg, To}, {Node,Receiver}) ->
    FromNode = get_node_name(From),
    ToNode = get_node_name(To),
    case FromNode/=node() andalso ToNode/=node() 
        andalso FromNode/=ToNode andalso 
        From/=nonode andalso To/=nonode of 
        true ->
            MsgSize = byte_size(term_to_binary(Msg)),
            Receiver!{trace_inter_node, FromNode,ToNode, MsgSize},
            {Node, Receiver};        
        false ->
            {Node, Receiver}
    end;
trace_parser({trace_ts, From, send, Msg, To, _TS}, {Node,Receiver}) ->
    FromNode = get_node_name(From),
    ToNode = get_node_name(To),
    case FromNode/=node() andalso ToNode/=node() 
        andalso FromNode/=ToNode andalso 
        From/=nonode andalso To/=nonode of 
        true ->
            MsgSize = byte_size(term_to_binary(Msg)),
            Receiver!{trace_inter_node, FromNode,ToNode, MsgSize},
            {Node, Receiver};        
        false ->
            {Node, Receiver}
    end;
trace_parser(_Trace={trace, Pid, in, Rq, _MFA}, {Node, Receiver}) ->
    case erlang:get({run_queue, Pid}) of 
        Rq ->
            {Node, Receiver};
        undefined ->
            erlang:put({run_queue, Pid}, Rq),
            {Node, Receiver};
        OldRq ->
            erlang:put({run_queue, Pid}, Rq),
            Receiver!{trace_rq, OldRq, Rq},
            {Node, Receiver}
    end;
trace_parser(_Trace={trace_ts, Pid, in, Rq, _MFA, _TS}, {Node, Receiver}) ->
    case erlang:get({run_queue, Pid}) of 
        Rq ->
            {Node, Receiver};
        undefined ->
            erlang:put({run_queue, Pid}, Rq),
            {Node, Receiver};
        OldRq ->
            erlang:put({run_queue, Pid}, Rq),
            Receiver!{trace_rq, OldRq, Rq},
            {Node, Receiver}
    end;
trace_parser(_Trace={trace_ts, _Pid, call, {s_group, Fun, Args}, _Ts}, 
             {Node, Receiver}) ->
    Receiver!{s_group, Node, Fun, Args},
    {Node, Receiver};
trace_parser(_Trace={trace, _Pid, call, {s_group, Fun, Args}}, 
             {Node, Receiver}) ->
    Receiver!{s_group, Node, Fun, Args},
    {Node, Receiver};
trace_parser(_Trace, {Node, Receiver}) ->
    {Node, Receiver}.

get_node_name({_RegName, Node}) ->    
    Node;
get_node_name(Arg) -> 
    try node(Arg) 
    catch _E1:_E2 ->
            nonode
    end.

run_orbit_with_trace() ->
    Nodes = ['node1@127.0.0.1', 'node2@127.0.0.1', 'node3@127.0.0.1'],
    rpc:call('node1@127.0.0.1', bench, dist_seq, 
             [fun bench:g124/1, 10000, 8,Nodes]).
    
%% percept2:profile("sim_code.dat", {sim_code,sim_code_detection, [["c:/cygwin/home/hl/git_repos/case_studies/par_sim_code/test"], 3, 40, 2, 4, 0.8, [], 8]},  [all]).

%% Example commands
%% percept2_sampling:sample( ['all'[["c:/cygwin/home/hl/test"], 5, 40, 2, 4, 0.8, 
%%                                                                      ["c:/cygwin/home/hl/test"],8]},"../profile_data").
%%percept2_sampling:sample([all, {'message_queue_len', 'percept2_db'}], {percept2, analyze, [["sim_code.dat"]]}, ".").
