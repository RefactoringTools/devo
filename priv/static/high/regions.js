var circles = [];
var nodes = [];
var edges = [];
var zones = [];
var multiplier = 3;
var c = 20;
var t = 200;
var k;
var rectangles;
var currentTime = 0;
var eulerText = "";
var width = 800;
var height = 600;
var circleEnum = { TOPOLOGY: 1, ADD : 2, REMOVE : 3};
var circleType = circleEnum.TOPOLOGY;
var interval; //holds force tick


var svg;
var times = [];

var conn = new WebSocket('ws://localhost:8080/websocket');
//var conn = new WebSocket('ws://cs.kent.ac.uk/~rb440/:8081');
conn.onopen = function(e) {
    console.log("Connection established in high/regions.js!");
};

conn.onmessage = function(e) {
	if (circleType == circleEnum.TOPOLOGY){
		parseCircles(e.data);
	} else if (circleType == circleEnum.ADD) {
		parseAddSGroupResponse(e.data);
	}
    
};


function next(){
	iterateGraph(nodes, edges);
}

function startForce(){
	interval = setInterval(
		function() {
			next();
			console.log("force tick");
		}
	,500);
}

function stopForce() {
	clearInterval(interval);
}


/*
function animate(){
	var m = 0;
	var changeValue = 100;
	$("#time").html(times[currentTime].time+" ms");
	var interval = setInterval(
		function() {
			m++;
			//console.log("m", m, "currentTime", currentTime);
			if (m % changeValue == changeValue-1) {
				currentTime++;
				$("#time").html(times[currentTime].time+" ms");
				if (currentTime == times.length){
					window.clearInterval(interval);
					console.log("done");
					return;
				}
				drawEdges(times[currentTime].interactions);
			}
			next();
		}
	,10);
}*/

function applyForceModel(){

}

function parseComms(commsFile){

	//var timeInstance = commsFile.split(",!");
	//var timeInstance = commsFile.split(",\n"); //replace when actually running from live stream data
	//var timeInt = parseInt(interactions[0].substring(1));

//{200,[{{node1@127.0.0.1,node2@127.0.0.1},1,240},{{node4@127.0.0.1,node3@127.0.0.1},3,152},{{node2@127.0.0.1,node4@127.0.0.1},22,46589}]}.


	var timeInstance = commsFile;
					
	//console.log(input[0], times);	
	//for (var i = 0; i < input.length; i++){
	//for (var i = 0; i < 2; i++){
	//	var timeInstance = input[i];

	//	var interactions = timeInstance.split(",\n"); //replace when actually running from live stream data
		var interactions = timeInstance.split("{{");
		
		var timeInt = "";
		//if (i == 0) {
			timeInt = parseInt(interactions[0].substring(1));
		//} else {
		//	timeInt = parseInt(interactions[0].substring(2));
		//}

		var time = new Time(timeInt);
		time.interactions = [];
		d3.select("#time").text(timeInt+" ms");
		//console.log(time, interactions);

		times.push(time);

		for (var j = 1; j < interactions.length; j++){
			var interactionDetails = interactions[j].split(",");

			//console.log(interactionDetails);

			var startAt = interactionDetails[0].indexOf("@");
			//var startVal = j == 1 ? 3 : 2;
			var start = interactionDetails[0].trim().substring(1,startAt);

			var finishAt = interactionDetails[1].indexOf("@");
			var finish = interactionDetails[1].trim().substring(1,finishAt);


			var count = parseInt(interactionDetails[2]);

			//console.log(time);

			var startNode = findNode(start, nodes);
			var finishNode = findNode(finish, nodes);
			//console.log(startNode, start, nodes);
			var edge = new Edge(startNode, finishNode, count);

			time.interactions.push( edge );
			console.log(start, startNode, finish, finishNode, count);
			//console.log(start, finish, count);
		}
		edges = time.interactions;
//	}
	//iterateGraph(nodes, time.interactions);
	drawEdges(time.interactions);
	//console.log(nodes, time.interactions);

}

function parseCircles(input){
	console.log("Input to parseCircles" + input);
	var circleFile = input.split("\n");
	//use 1 as first row of input are labels
	for (var i = 1; i < circleFile.length-1; i++){
		var result = circleFile[i].split(",");
		//console.log(result);

		var c = findCircleId(result[0].trim());
		console.log(c);
		if (c.newCircle){
			c.r = parseInt(result[3]);
			c.x = parseInt(result[1]);
			c.y = parseInt(result[2]);
			c.newCircle = false;
		}
		else {
			console.log("duplicate needed");

			var c2 = new Circle(result[0].trim(), c.label, parseInt(result[3]), parseInt(result[1]), parseInt(result[2]));
			c2.newCircle = false;
			circles.push(c2);

		}

		
		//var c = new Circle(result[0].trim(), , parseInt(result[1]), parseInt(result[2]));
		//circles.push(c);	
	}

	console.log(circles);

	zones = eulerText.split(" ");
	zones.pop();
	console.log(zones);
	zones = removeDuplicates(zones);
	console.log(zones);

	rectangles = findZoneRectangles(zones, circles);

	for (var i = 0; i < nodes.length; i++) {
		var n = nodes[i];
		n.region = findRectangleFromLabel(n.regionText, rectangles);
	}

	drawGraph(nodes, null, rectangles, circles);

}


function parseHighTopology(input) {

	if (input == "{s_group_init_config, []}") {
		//no initial configuration
		parseCircles("\n a,"+width/2 + "," + height/2 + "," + height/2);
	} else {
		var grpText = input.split("{");
		for (var i = 2; i < grpText.length; i++){
			var grpDetails = grpText[i].split(",");
			var grpName = grpDetails[0].trim();

			var id = String.fromCharCode(circles.length + 65);
			var c = new Circle(id, grpName, 0, 0, 0);
			c.newCircle = true;
			circles.push(c);

			//console.log(grpName, id, c);

			for (var j = 1; j < grpDetails.length; j++){
				var rawNodeName = grpDetails[j];
				if (rawNodeName == "") {
					continue;
				}
				var at = rawNodeName.indexOf("@");
				var start = j==1 ? 2 : 1;
				var nodeName = rawNodeName.substring(start,at).trim();

				//console.log(nodeName);

				var nodeFound = findNode(nodeName, nodes);
				if (nodeFound == null) {
					var node = new Node(nodeName, null, id);
					nodes.push(node);
				} else {
					nodeFound.regionText = nodeFound.regionText+id;
				//	console.log("node found");
				}
			}

		}
		console.log(circles, nodes);

		eulerText = "";
		for (var i = 0; i < nodes.length; i++){
			eulerText = eulerText + nodes[i].regionText + " ";
		}

		console.log(eulerText);
		var msgPrefix = "EULERTEXT:";
		conn.send(msgPrefix + eulerText);
	}


}

function parseInput(input){

	stopForce();

	if (input.split(",")[2] == "new_s_group"){
		parseAddSGroup(input);
		//startForce();
	} else if (input.split(",")[2] == "delete_s_group"){
		parseDeleteSGroup(input);
		//startForce();
	} else if (input.split(",")[2] == "add_nodes"){
		parseAddNodes(input);
		//startForce();
	} else if (input.split(",")[2] == "remove_nodes"){
		parseRemoveNodes(input);
		//startForce();
	} else if (input.substring(0,20) == "{s_group_init_config"){
		parseHighTopology(input);
	} else {
		parseComms(input);
		//startForce();
	}
}

function parseAddSGroup(input) {
	//{s_group,'node1@127.0.0.1',new_s_group,[{aa, ['node1@127.0.0.1','node2@127.0.0.1']}]}.

	var grpDetails = input.split(",");

	var sgroupName = grpDetails[3].substring(1);
	console.log(sgroupName, grpDetails);

	//var id = String.fromCharCode(circles.length + 65);
	var id = findNextCircleKey(circles);

	var circle = new Circle(id, sgroupName, -1, -1, -1);
	circle.newCircle = true;
	circles.push(circle);

	for (var j = 4; j < grpDetails.length; j++) {
		console.log(grpDetails[j]);
		var rawName = grpDetails[j];
		var at = rawName.indexOf("@");
		
		var start = j == 4 ? 2 : 1
		var nodeName = rawName.substring(start, at);
		console.log(j, "nodeName", nodeName);

		var node = findNode(nodeName, nodes);

		if (node == null){
			node = new Node(nodeName, null, id);
			node.newNode = true;
			nodes.push(node);
		} else {
			node.regionText = node.regionText + id;
		}

		//if node = null, create new node

		//change node RegionText
		//change node region


		console.log(nodeName, node);
	}

	circleType = circleEnum.ADD;

	eulerText = "";
	for (var i = 0; i < nodes.length; i++){
		//nodes[i].region = findRectangleFromLabel(nodes[i].regionText);
		eulerText = eulerText + nodes[i].regionText + " ";
	}

	console.log(eulerText);
	var msgPrefix = "EULERTEXT";
	conn.send(msgPrefix + eulerText);

	//recalculate circles
	//recalculate zones

}

function parseAddSGroupResponse(input) {

	console.log(input);

	var circleFile = input.split("\n");
	
	//use 1 as first row of input are labels
	for (var i = 1; i < circleFile.length-1; i++){
		var result = circleFile[i].split(",");
		//console.log(result);

		var c = findCircleIdHaventMoved(result[0].trim(), circles);
		console.log("moving circle", circles.indexOf(c));
		console.log("before", c);
		if (c == null) {

		} else {
			
			c.r = parseInt(result[3]) * multiplier;
			c.x = parseInt(result[1]) * multiplier;
			c.y = parseInt(result[2]) * multiplier;
			c.moved = true;
		}
		console.log("after", c);
		//var c = new Circle(result[0].trim(), , parseInt(result[1]), parseInt(result[2]));
		
			
		//console.log(c);

	}

	console.log(circles);

	zones = eulerText.split(" ");
	zones.pop();
	console.log(zones);
	zones = removeDuplicates(zones);
	rectangles = findZoneRectangles(zones, circles);

	for (var i = 0; i < nodes.length; i++) {
		var n = nodes[i];
		console.log(n, n.region);
		n.region = findRectangleFromLabel(n.regionText, rectangles);
		if (n.newNode) {
			console.log("need to draw Node: ", n);
			n.x = findNodeStartX(n, nodes.length, false);
			n.y = findNodeStartY(n, nodes.length, false);
			addNode(n);
			n.newNode = false;
		}
	}

	for (var j = 0; j < circles.length; j++){
		var c = circles[j];
		c.moved = false;
		console.log("newcheck", j, c.newCircle);
		if (c.newCircle){
			c.newCircle = false;
			addSGroup(c);
		} else {
			console.log("moving SVG circle", c, j, c.r, c.x, c.y);
			moveCircle(c, c.x, c.y, c.r);
		}
	}

	

}

function parseDeleteSGroup(input){

	var sGroupName = input.split(",")[3];
	sGroupName = sGroupName.substring(1,sGroupName.length-3);
	//var removedCircles = [];
	var id = "";
	//remove circle from list
	var removedCircles = findAllCirclesLabel(sGroupName, circles);
	for (var i = 0; i < removedCircles.length; i++) {
		var circleIndex = circles.indexOf(removedCircles[i]);
		id = removedCircles[i].id;
		//console.log(circles[0], circles[1], circles[2], circleIndex, circle);
		if (circleIndex != -1) {
			circles.splice(circleIndex, 1);
		}
		//console.log(circles[0], circles[1], circles[2]);
		console.log(sGroupName, removedCircles[i].id);
	}
	
	console.log(id, rectangles);
	var validRectangles = findAllRectanglesFromLabel(id, rectangles);

	//console.log(rectangle);

	zones = [];
	//remove this sgroup from nodes
	for (var i = 0; i < nodes.length; i++){
		var node = nodes[i];
		console.log(i, node, node.region, node.regionText);
		//this node is only in deleted group, so remove node
		if (validRectangles.indexOf(node.region) != -1) {
			//remove node
			removeNode(node); //removes node from svg
			nodes.splice(i, 1);
			i--;
			console.log("removed node", node);
			
		} else {
			//remove this region from node's regionText
			var index = node.regionText.indexOf(id);
			//console.log(node.regionText, index, node.regionText.substring(0,index), node.regionText.substring(index+1));
			var newRegionText = node.regionText.substring(0,index) + node.regionText.substring(index+1);
			node.regionText = newRegionText;

			//build zones, if this region isn't already there
			if (zones.indexOf(newRegionText) == -1 && newRegionText != "") {
				zones.push(newRegionText);
			}
			console.log(node.regionText);
		}

	}
	//console.log(zones, circles);
	//rebuild rectangles
	zones = removeDuplicates(zones);
	rectangles = findZoneRectangles(zones, circles);
	
	//console.log (nodes);
	//assign node correct new region
	for (var i = 0; i < nodes.length; i++){
		var node = nodes[i];
		node.region = findRectangleFromLabel(node.regionText, rectangles);
	}
	
	for (var i = 0; i < removedCircles.length; i++){
		deleteSGroup(removedCircles[i]);
	}

	//remove svg of circle

	console.log(sGroupName, zones, rectangles, removedCircles, circles);

	//{s_group, CurrentNode, delete_s_group, [Nodes]}
	redrawVis();

//e.g. {s_group,'node1@127.0.0.1',delete_s_group,[aa]}.
}

function parseAddNodes(input) {

//{s_group,'node1@127.0.0.1',add_nodes,[aa,['node3@127.0.0.1']]}.

	var circleLabel = input.split(",")[3].substring(1);
	var circle = findCircleLabel(circleLabel);
	var rectangle = findRectangleFromLabel(circle.id, rectangles);

	var nodesArr = input.split(",");
	for (var i = 4; i < nodesArr.length; i++){
		//console.log(nodesArr[i]);
		var rawNode = nodesArr[i];

		var start = 1;
		var finish = rawNode.indexOf("@");

		if (i == 4){
			start = 2;
		}
		var nodeName = rawNode.substring(start, finish);

		var node = findNode(nodeName, nodes);
		if (node == null) {

			node = new Node(nodeName, rectangle, circle.id);
			nodes.push(node);
			node.x = findNodeStartX(node, nodes.length, false);
			node.y = findNodeStartY(node, nodes.length, false);
			
			addNode(node);

		} else {
			console.log("groupings need to change")
			node.regionText = node.regionText + circle.id;
			node.regionText = node.regionText.split("").sort().join("");
		}
		console.log(node, nodeName, node.regionText, rectangle);
	}

	circleType = circleEnum.ADD;

	eulerText = "";
	for (var i = 0; i < nodes.length; i++){
		//nodes[i].region = findRectangleFromLabel(nodes[i].regionText);
		eulerText = eulerText + nodes[i].regionText + " ";
	}

	console.log(eulerText);

	conn.send(eulerText);


}

function parseRemoveNodes(input) {

	var circleLabel = input.split(",")[3].substring(1);
	var circle = findCircleLabel(circleLabel);
	var rectangle = findRectangleFromLabel(circle.id, rectangles);

	var nodesArr = input.split(",");
	for (var i = 4; i < nodesArr.length; i++){
		//console.log(nodesArr[i]);
		var rawNode = nodesArr[i];

		var start = 1;
		var finish = rawNode.indexOf("@");

		if (i == 4){
			start = 2;
		}
		var nodeName = rawNode.substring(start, finish);
		var node = findNode(nodeName, nodes);
		var nodeI = nodes.indexOf(node);
		nodes.splice(nodeI, 1);

		console.log(nodeName, node);
		
		removeNode(node);

		console.log(nodeName, nodes, rectangle);
	}

	redrawVis();

}

function redrawVis() {

	circleType = circleEnum.ADD;

	eulerText = "";
	for (var i = 0; i < nodes.length; i++){
		//nodes[i].region = findRectangleFromLabel(nodes[i].regionText);
		eulerText = eulerText + nodes[i].regionText + " ";
	}

	console.log(eulerText);

	conn.send(eulerText);

}
