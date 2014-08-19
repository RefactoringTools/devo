#!/bin/sh
./start.sh node2@127.0.0.1 -detached
./start.sh node5@127.0.0.1 -detached
./start.sh node4@127.0.0.1 -detached
./start.sh node3@127.0.0.1 -detached
./start.sh node1@127.0.0.1
