Devo -- Online SD Erlang Profiling and Visualisation
=====================================================

To compile the code you need rebar in your PATH.

Type the following command:
```
$ make
```
Then:

```
$ cd tests
$ erlc *.erl
```

Introduction to Devo
--------------------
Devo has two visualisation modes, low and high level. The low level visualisation shows the length of each run queue on each of your processor's cores and the migration of processes between cores. 

The high level visualisation is dependent on the SD-Erlang S_group feature. This visualisation shows each of the nodes in your system, colors them according to which s_group they belong to, and displays the amount of message sending that is currently occuring within each s_group.

### The Devo interface

You can start the devo server from the root devo directory  by running

```
./start.sh
```

In a web-browser if you navigate to 'localhost:8080' the Devo home page should be displayed. There should be two radio buttons at the top that allow you to select which type of visualisation you want. Below that is where you must list the nodes that you want Devo to visualize. You can manually enter the node name into the text field or if your nodes follow a numeric pattern (e.g. 'node1@127.0.0.1', 'node2@127.0.0.1', ...) Devo can generate these names for you. Finally there is the start/stop button that toggles the visualisation on or off.

Running Examples
----------------

Start a devo server as described above.

Open a new terminal window and go to the 'devo/tests' directory and run:

```
./start.sh node1@127.0.0.1
```

An Erlang repl should be running in this terminal now. Go back to the devo webpage and add 'node1' to the list of Devo's nodes, and start the visualisation. You should see the graphic representing your processor's cores but nothing will be running. Go back to the terminal with the node1 repl and enter 

```
orbit:run_on_one_node().
``` 
now if you look at your web-browser you should see the visualisation.

###High Level Visualisation

**You must have SD Erlang installed to run the high level visualisation**

First, if you just ran the low level example kill the 'node1' repl. In a terminal that is in the 'devo/tests' directory run

```
./fiveNodeLocalStart.sh
``` 

You should now see an Erlang repl for 'node1@127.0.0.1'. The difference is that this time there are four additional Erlang nodes running in the background. 

Go to the devo webpage and generate five Erlang nodes, the basename is "node", the start index is 1, the end index is 5, and the domain is "@127.0.0.1". When you start the visualisation this time the five nodes should appear as colored circles. To run this example go back to the 'node1' repl and enter 

```
high_level_test:run().
``` 
this will take you through a set of s_group operations and distributed computing examples which will be visualised by Devo.

Integrating Devo into your Project
----------------------------------

Using Devo to visualize your own project should be fairly simple.

The first step is including Devo's custom implementation of the DBG module in your project's path. After running the make command you can copy devo_dbg.beam from the ebin folder to your project's path.

If your project has some initial s_group configuration without calling new_s_group then this configuration should be placed in an s_group.config file. For example config file syntax see:
   %DEVOROOT%/tests/s_group.config

Now you are ready to startup devo and your own project. After both of these services are running navigate to the devo homepage and you should be ready to start profiling.