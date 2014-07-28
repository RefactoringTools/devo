var circles = [];
var nodes = [];
var edges = [];
var zones = [];
var groups = [];
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

function parseComms(commsFile){
	var timeInstance = commsFile;	
		var interactions = timeInstance.split("{{");
		
		var timeInt = "";

		var time = new Time(timeInt);
		time.interactions = [];
		d3.select("#time").text(timeInt+" ms");
		times.push(time);
    
		for (var j = 1; j < interactions.length; j++){
			var interactionDetails = interactions[j].split(",");

			var start = interactionDetails[0].trim().replace(/[{}']/g,'');

			var finish = interactionDetails[1].trim().replace(/[{}']/g,'');

			var count = parseInt(interactionDetails[2]);

		        var size = parseInt(interactionDetails[3]);
			var startNode = findNode(start, nodes);
			var finishNode = findNode(finish, nodes);
		        addCountToEdge(startNode, finishNode,count,size);
		    


		}
    if(interactions.length > 1)
	{
            drawEdges(edges);
	} else {
	    resetEdgeColor();
	}

}

function addCountToEdge(start, finish, count,size) {
    var e = lookupEdge(start,finish,edges);
    e.size = count;
    e.totalCount += count;
    e.totalSize += size;
}

function profilingStopped(){
    nodes = [];
    circles = [];
    rectangles = [];
    groups = [];
}

function parseHighTopology(input) {
    var grpArrStr = input.replace(/\s+/, "").replace("{s_group_init_config,","").slice(0,-1);
    parseGroupStr(grpArrStr);
    edges = generateEdges(nodes);
    drawForceGraph(nodes,edges);
}

function generateEdges(ns){
    var nodesDone = [];
    var edges = [];
    var tmpNodes = ns;
    for(var i = 0; i < ns.length; i++){
	var n = tmpNodes[i];
	var temp = createEdges(n,nodesDone,ns);
	edges = edges.concat(temp);
	nodesDone.push(n);
    }
    return edges;
}

function createEdges(node, nodesDone, ns){
    var edges = [];
    var tmpNodes = ns;
    for(var i = 0; i < ns.length; i++){
	var n = tmpNodes[i];
	if(n != node && $.inArray(n,nodesDone) === -1){
	    for(var j = 0; j <node.groups.length;j++){
		var group = node.groups[j];
		if(group.bothNodesInGroup(node,n)){
		    var edge = new Edge(node,n,1);
		    edges.push(edge);
		    j = node.groups.length;
		}
	    }
	}
    }
    return edges;
}

function parseGroupStr(str){
    // Get rid of outer braces
    var groupStrings = str.replace('[{', '').slice(0,-1);
    while(!(groupStrings === "")){
	var s_groupNameArr = getGroupName(groupStrings);
	groupStrings = s_groupNameArr[0];
	var s_group = new S_group(s_groupNameArr[1]);
	groups.push(s_group);
	groupStrings = parseNodes(groupStrings, s_group);
    }
}

function parseNodes(str, s_group){
    var endingBraceLoc = str.indexOf(']');
    var groups = str.substr(0,endingBraceLoc).slice(1).split(',');
    var nodeNames = [];
    groups.forEach(function(s) {nodeNames.push(s.slice(1,-1));});
    nodeNames.forEach(function(name) {createNode(name,s_group);});
    // The plus four removes the ']},{' before the next group name
    return str.slice(endingBraceLoc+4);
}

function createNode(name,s_group) {
    var node = getNode(name);
    if(node === null){
	node = new Node2(name,s_group);
	nodes.push(node);
    } else {
	if (!node.isInGroup(s_group)){
	    node.addToGroup(s_group);
	}
    }    
}

function getNode(name){
    var res = null;
    nodes.forEach(function (n) {if (n.name === name){res = n;}});
    return res;
}

function getGroupName(str){
    var nextComma = str.indexOf(',');
    var groupName = str.substr(0,nextComma);
    // Cuts off the group name as well as the comma before the list of node names
    str = str.slice(nextComma+1);
    return [str,groupName];
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
	//"{s_group,'node1@127.0.0.1',new_s_group,[group1,['node1@127.0.0.1','node2@127.0.0.1']]}."

    var grpDetails = input.split(",");

    var sgroupName = grpDetails[3].substring(1);
    var nodeStrings = grpDetails.slice(4);
    nodeStrings = parseNodeArray(nodeStrings);
    var newGroup = new S_group(sgroupName);
    var newNodes = [];
    nodeStrings.forEach(function (n){
	newNodes.push(new Node2(n,newGroup));
    });
    var newEdges = generateEdges(newNodes);
    addNodes(newNodes,newEdges);
}

function parseNodeArray(strings){
    strings[0] = strings[0].substring(1);
    strings[strings.length-1] = strings[strings.length-1].slice(0,-4);
    var res = [];
    for (var i = 0; i < strings.length; i++){
	res[i] = strings[i].replace(/'/g,"");
    }
    return res;
}

function parseDeleteSGroup(input){
    
    // "{s_group,'node1@127.0.0.1',delete_s_group,[group1]}."
    var sGroupName = input.split(",")[3];
    sGroupName = sGroupName.substring(1,sGroupName.length-3);
    var group = groups.filter(function (e){return (e.name === sGroupName);})[0];
    var singleGroupNodes = group.nodes;
    var nodesForRecolor = [];
    for (var i = 0 ;i<singleGroupNodes.length;i++){
	var temp = singleGroupNodes[i];
	if(temp.groups.length > 1){
	    removeElement(group,temp.groups);
	    removeElement(temp,singleGroupNodes);
	    nodesForRecolor.push(temp);
	}
	
    }
    removeNodes(singleGroupNodes);
    recolorNodes(nodesForRecolor);
}

function removeElement(elem, arr){
    var index;
    for(var i = 0; i<arr.length;i++){
	var temp = arr[i];
	if (temp === elem){
	    index = i;
	}
    }
    return arr.splice(index,1);
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
			console.log("groupings need to change");
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
