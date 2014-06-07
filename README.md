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

Running Single Node Examples
----------------------------

After running make and the compiler you are ready to run the single node examples.

In the tests directory run:

```
./start.sh node1@127.0.0.1
```

Open up another terminal window and go to the top level devo directory. There run:

```
./start.sh
```

Then in a web browser navigate to localhost:8080.

There are five bullet point options at the top of this page. The first three bullets are single node examples. Select one of the single node examples, add 'node1@127.0.0.1' to the list, and highlight it. Finally click the start visualization button. 

To actually see the visualization you will need to make your node run something. Go back to the terminal window that is running the tests directory process and enter:

```
orbit:run_on_one_node().
```

When you check your browser now the visualization should be running. You can see a video of this process here: https://www.youtube.com/watch?v=2k2Sd4z5g7I 