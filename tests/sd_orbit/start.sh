#!/bin/sh
erl -name node2@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin  ./ebin
erl -name node3@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin  ./ebin
erl -name node4@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin  ./ebin
erl -name node5@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin  ./ebin
erl -name node6@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin  ./ebin
erl -name node7@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin  ./ebin
erl -name node8@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin  ./ebin
erl -name node9@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin  ./ebin
erl -name node10@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin ./ebin
erl -name node11@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin ./ebin
erl -name node12@127.0.0.1 -detached  -setcookie "secret" -pa ../../ebin  ./ebin
erl -name node1@127.0.0.1  -setcookie "secret" -pa ../../ebin  ./ebin -config s_group.config 
