%% @private
-module(devo_app).
-behaviour(application).

%% API.
-export([start/2]).
-export([stop/1]).

start(_Type, _Args) ->
    Dispatch = 
        cowboy_router:compile([
                               {'_', [
                                      {"/", devo_toppage_handler, []},
                                      {"/websocket", devo_ws_handler, []},
                                      {"/static/[...]", cowboy_static,
                                       {priv_dir, devo, "static"}}]}]),
    {ok, _} = cowboy:start_http(http, 100, [{port, 8080}],
                                    [{env, [{dispatch, Dispatch}]}]),
    devo_sup:start_link().

stop(_State) ->
	ok.