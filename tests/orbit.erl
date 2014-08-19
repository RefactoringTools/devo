-module(orbit).

-compile(export_all).

run_on_one_node() ->
    Nodes=['node1@127.0.0.1'],
    bench:dist_seq(fun bench:g124/1, 100000, 8,Nodes).
   
run_on_five_nodes() ->
    Nodes = ['node1@127.0.0.1', 'node2@127.0.0.1', 'node3@127.0.0.1',
             'node4@127.0.0.1', 'node5@127.0.0.1'],
    bench:dist_seq(fun bench:g124/1, 100000, 8,Nodes).
      
teardown(N) -> 
    F=fun(I) ->
              Node=list_to_atom("node"++integer_to_list(I)++"@127.0.0.1"),
              rpc:call(Node, erlang, halt, [])
      end,
    lists:foreach(fun(I) -> F(I) end, lists:seq(1, N)).

stop(Node)->
    rpc:call(Node, erlang, halt, []).

stop_all()->
    stop('node2@127.0.0.1'),
    stop('node3@127.0.0.1'),
    stop('node4@127.0.0.1'),
    stop('node5@127.0.0.1').
    
