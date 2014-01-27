%% starts the benchmark
%%
%% Author: Amir Ghaffari <Amir.Ghaffari@glasgow.ac.uk>
%%
%% RELEASE project (http://www.release-project.eu/)
%%

-module(init_bench).

-export([main/0, main/1]).

main() ->
    application:set_env(kernel, s_groups, []),
    G=fun bench:g12345/1, 
    N= 40000, %% 100000%% calculates Orbit for 0..N
    P= 40, %% Naumber of worker processes on each node
    G_size=4, %% Number of nodes in each s_group
    Nodes=config:get_key(nodes), %% Loads list of node names from config file
    NumGroups=length(Nodes) div G_size,
    Start = now(),
    if 
		NumGroups>0 ->
			NumberOfGroups=NumGroups,
			Group_size=G_size;
		true ->
			NumberOfGroups=1, %% when number of nodes is less than group size
			Group_size=length(Nodes)
	end,    
	bench:dist(G,N,P,Nodes,NumberOfGroups),
    LapsedUs = timer:now_diff(now(), Start),
    [rpc:call(Node, erlang, halt, [])||Node<-(Nodes--[node()])],
    io:format("N:~p  ---- Num process: ~p  --- Num Nodes: ~p  ---- Group size: ~p \n",[N, P, length(Nodes), Group_size]),
    io:format("Elapsed time in total (microseconds): ~p \n",[LapsedUs]). %microseconds


main(Nodes) ->
    G=fun bench:g12345/1, 
    N= 100000, %% 100000%% calculates Orbit for 0..N
    P= 40, %% Naumber of worker processes on each node
    G_size=5, %% Number of nodes in each s_group
   %% Nodes=config:get_key(nodes), %% Loads list of node names from config file
    NumGroups=length(Nodes) div G_size,
    Start = now(),
    if 
		NumGroups>0 ->
			NumberOfGroups=NumGroups,
			Group_size=G_size;
		true ->
			NumberOfGroups=1, %% when number of nodes is less than group size
			Group_size=length(Nodes)
	end,    
	bench:dist(G,N,P,Nodes,NumberOfGroups),
    LapsedUs = timer:now_diff(now(), Start),
    io:format("N:~p  ---- Num process: ~p  --- Num Nodes: ~p  ---- Group size: ~p \n",[N, P, length(Nodes), Group_size]),
    io:format("Elapsed time in total (microseconds): ~p \n",[LapsedUs]). %microseconds
