#!/bin/sh
erl -name $1 $2 -pa ../ebin -config s_group.config 

 
