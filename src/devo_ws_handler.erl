-module(devo_ws_handler).
-behaviour(cowboy_websocket_handler).

-export([init/3]).
-export([websocket_init/3]).
-export([websocket_handle/3]).
-export([websocket_info/3]).
-export([websocket_terminate/3]).

-record(state, {
               count =1          :: integer(),
               cmd   = undefined :: any(),
               nodes =[]         :: [node()],
               data  = []        :: any()
              }).                        

init({tcp, http}, _Req, _Opts) ->
    {upgrade, protocol, cowboy_websocket}.

websocket_init(_TransportName, Req, _Opts) ->
    case whereis(devo) of 
        undefined ->
            register(devo, self());
        _ -> 
            unregister(devo),
            register(devo, self())
    end,
    {ok, Req, #state{}}.

websocket_handle({text, <<"stop">>}, Req, State) ->
    Cmd = State#state.cmd, 
    Nodes = State#state.nodes,
    profiling:stop_profiling(Cmd, Nodes),
    {shutdown, Req, State};
websocket_handle({text, <<"start">>}, Req, State) ->
    {ok, Req, State};
websocket_handle({text, Msg}, Req, State) ->
    MsgStr=binary_to_list(Msg), 
    case string:tokens(MsgStr, ":") of
        ["start_profile",Feature, NodeStr] ->
            Nodes= string:tokens(NodeStr, ";"),
            Ns = [list_to_atom(N)||N<-Nodes],
            Cmd = list_to_atom(Feature),
            profiling:start_profiling(Cmd, Ns, self()),
            NewState=State#state{cmd=Cmd, nodes=Ns},
            {ok, Req, NewState};
        _ ->
            Msg = "Unexpected message from client:"++ binary_to_list(Msg),
            {reply, {text,list_to_binary(Msg)}, State}
    end;
websocket_handle(_Data, Req, State) ->
    {ok, Req, State}.


websocket_info({timeout, _Ref, stop_profile}, Req, State) ->
    {shutdown, Req, State};
websocket_info({timeout, _Ref, _Msg}, Req, State) ->
    Cnt = State#state.count,
    StateStr=case lists:member(State#state.cmd,
                               [migration, rq_migration])
             of 
                 true ->
                     Data = [{From, To, Times}||
                                {{From, To}, Times}<-State#state.data],
                     lists:flatten(
                       io_lib:format("{~.3f,~p}.", 
                                     [Cnt*200/1000,Data]));
                 false -> 
                     lists:flatten(
                       io_lib:format("{~.3f,~p}.", 
                                     [Cnt*200/1000,
                                      State#state.data]))
             end,
    erlang:start_timer(200, self(), <<"timeout">>),
    {reply, {text, list_to_binary(rm_whites(StateStr))}, Req, 
     State#state{count=Cnt+1, data=[]}};
websocket_info({trace_inter_node, From, To, _MsgSize}, Req, State=#state{data=_Data}) when 
        From ==nonode orelse To==nonode->
    {ok, Req, State};
websocket_info({trace_inter_node, From, To, MsgSize}, Req, State=#state{data=Data}) ->
    Key = {From, To},
    NewData=case lists:keyfind(Key, 1, Data) of
                false ->
                    [{{From, To},1, MsgSize}|Data];
                {_, Count, SumSize} ->
                    lists:keyreplace({From, To}, 1, 
                                     Data, {Key, Count+1, MsgSize+SumSize})
            end,
    {ok, Req, State#state{data=NewData}};
websocket_info({trace_rq, FromRq, ToRq}, Req, State=#state{data=Data}) ->
    Key = {FromRq, ToRq},
    NewData=case lists:keyfind(Key, 1, Data) of
                 false ->
                     [{{FromRq, ToRq},1}|Data];
                 {_, Count} ->
                     lists:keyreplace({FromRq, ToRq}, 1, 
                                      Data, {Key, Count+1})
             end,
    {ok, Req, State#state{data=NewData}};
websocket_info(_Info={run_queues_info, Ts, Rqs}, Req, State) ->
    Str=lists:flatten([" "++integer_to_list(Len)++" "
                       ||Len<-tuple_to_list(Rqs)]),
    InfoStr=lists:flatten(io_lib:format("~p ~s", [Ts, Str])),
    {reply, {text, list_to_binary(InfoStr)}, Req, State};
websocket_info(_Info={message_queue_len_info, Ts, Len}, Req, State) ->
    InfoStr=lists:flatten(io_lib:format("~p ~p", [Ts, Len])),
    {reply, {text, list_to_binary(InfoStr)}, Req, State};
websocket_info(Info={s_group, _Node, _Fun, _Args}, Req, State) ->
    InfoStr=lists:flatten(io_lib:format("~p.", [Info])),
    {reply, {text, list_to_binary(rm_whites(InfoStr))}, Req, State};

websocket_info(Info={cpu, _Cpu}, Req, State) ->
    InfoStr=lists:flatten(io_lib:format("~p.", [Info])),
    {reply, {text, list_to_binary(rm_whites(InfoStr))}, Req, State};
websocket_info(Info={s_group_init_config, _Config}, Req, State) ->
    InfoStr=lists:flatten(io_lib:format("~p.", [Info])),
    {reply, {text, list_to_binary(rm_whites(InfoStr))}, Req, State};
websocket_info(start_profile, Req, State) ->
    erlang:start_timer(1, self(), <<"Online profiling started...!">>),
    {ok, Req, State};
websocket_info(stop_profile, Req, State) ->
    self()!stop_profile,
    {ok, Req, State};
websocket_info(Info, Req, State) ->
    io:format("Devo_ws_handler:unexpected trace:~p\n", [Info]),
    {ok, Req, State}.

websocket_terminate(_Reason, _Req, _State) ->
	ok.

rm_whites(Str) ->
    [C||C<-Str, C=/=$\s, C=/=$\r,  C=/=$\n].
    
