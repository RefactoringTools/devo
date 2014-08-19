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

Running Examples
----------------
In the tests directory run:

```
./start.sh node1@127.0.0.1
```

Open up another terminal window and go to the top level devo directory. There run:

```
./start.sh
```

Then in a web browser navigate to localhost:8080.

There are five bullet point options at the top of this page. The first three options can be run the same way. Select one of these examples, add 'node1@127.0.0.1' to the list, and highlight it. Finally click the start visualization button. 

To actually see the visualization you will need to make your node run something. Go back to the terminal window that is running the tests directory process and enter:

```
orbit:run_on_one_node().
```

When you check your browser now the visualization should be running. You can see a video of this process here: https://www.youtube.com/watch?v=2k2Sd4z5g7I

### Running the Inter-node Communication Example

To run the fourth option start by entering:

```
./fiveNodeLocalStart.sh
```
This automatically starts five erlang nodes.

Go to the web inteface then add and select all of these nodes and start the visualization. Now go back to the terminal that is running all of the nodes and type:

```
orbit:run_on_five_nodes().
```

When you want to stop the detached nodes run these commands in the node1 command line.

```
orbit:stop('node2@127.0.0.1').
orbit:stop('node3@127.0.0.1').
orbit:stop('node4@127.0.0.1').
orbit:stop('node5@127.0.0.1').
```

### Visualizing S_group operations

For the final two visualization options require an installation of SD Erlang. The setup for this example is the same as the previous example except that this time the command to node1 will be:

```
test_s_group:run().
```

### Full High Level visualisation

The 'High level visualisation' option combines both the S_group operations and inter-node communication visualisations. The testing script is much like the s_group operations example and can be started by running:

```
high_level_test:run().
```

On node1.

Integrating Devo into your project
----------------------------------

Using Devo to visualize your own project should be fairly simple.

The first step is including Devo's custom implementation of the DBG module in your project's path. After running the make command you can copy dbg.beam from the ebin folder to your project's path.

If your project has some initial s_group configuration without calling new_s_group then this configuration should be placed in an s_group.config file. For example config file syntax see:
   %DEVOROOT%/tests/s_group.config

Now you are ready to startup devo and your own project. After both of these services are running navigate to the devo homepage and you should be ready to start profiling.