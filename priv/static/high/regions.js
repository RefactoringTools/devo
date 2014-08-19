//var nodes = [];
//var edges = [];
//var groups = [];
var multiplier = 3;
var c = 20;
var t = 200;
var k;
var currentTime = 0;
var eulerText = "";
var width = 800;
var height = 600;
var circleEnum = { TOPOLOGY: 1, ADD : 2, REMOVE : 3};
var circleType = circleEnum.TOPOLOGY;
var interval; //holds force tick


var svg;
var times = [];

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
			var startNode = findNode(start, d3Nodes);
			var finishNode = findNode(finish, d3Nodes);
		        addCountToEdge(startNode, finishNode,count,size);
		    


		}
    if(interactions.length > 1)
	{
            drawEdges(d3Edges);
	} else {
	    resetEdgeColor();
	}

}

function addCountToEdge(start, finish, count,size) {
    var e = lookupEdge(start,finish,d3Edges);
    e.size = count;
    e.totalCount += count;
    e.totalSize += size;
}

function profilingStopped(){
    d3Nodes = [];
    groups = [];
}

function parseHighTopology(input) {
    var grpArrStr = input.replace(/\s+/, "").replace("{s_group_init_config,","").slice(0,-1);
    parseGroupStr(grpArrStr);
    if (!(d3Nodes.length === 0)){
        d3Edges = generateEdges(d3Nodes);
    } else {
	d3Edges = [];
    }
    drawForceGraph(d3Nodes,d3Edges);
}

function generateEdges(ns){
    return getEdges(ns,[]);
}

function getEdges(ns, nodesDone){
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
    if (groupStrings === "[]"){
        return;
    }
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
    if(node === -1){
	node = new Node2(name,s_group);
	d3Nodes.push(node);
    } else {
	if (!node.isInGroup(s_group)){
	    node.addToGroup(s_group);
	}
    }    
}

function getNode(name){
    var res = -1;
    d3Nodes.forEach(function (n) {if (n.name === name){res = n;}});
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

	//stopForce();

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
    groups.push(newGroup);
    var nodeRes = getNodes(nodeStrings,newGroup);
    var newNodes = nodeRes[1];
    var allNodes = nodeRes[0];
    var newEdges = generateNewEdges(allNodes);
    addNodes(newNodes,newEdges);
}

function generateNewEdges(nodes){
    var res = [];
    for(var i = 0; i < nodes.length; i++){
	for(var j = 0; j < nodes.length; j++){
	    var node1 = nodes[i];
	    var node2 = nodes[j];
	    if(!(node1 === node2)){
		var lookup = lookupEdge(node1,node2,d3Edges.concat(res));
		if(lookup === -1){
		    var newEdge = new Edge(node1, node2, 1);
		    res.push(newEdge);
		}
	    }
	}
    }
    return res;
}

function getNodes(nodeNames, s_group){
    var allNodes = [];
    var newNodes = [];
    for(var i = 0; i< nodeNames.length; i++){
	var name = nodeNames[i];
	var node = getNode(name);
	if(node === -1){
	    node = new Node2(name, s_group);
	    newNodes.push(node);
	} else {
	    node.addToGroup(s_group);
	}
	allNodes.push(node);
    }
    return [allNodes, newNodes];
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
    removeElement(group,groups);
    removeNodes(singleGroupNodes);
    refreshForceGraph();
    recolorNodes(nodesForRecolor);
}

function parseAddNodes(input) {

    //"{s_group,'node1@127.0.0.1',add_nodes,[group1,['node3@127.0.0.1']]}."

    var groupName = input.split(",")[3].substring(1);
    var nodesArr = input.split(",");
    //The node to be added
    //['node3@127.0.0.1']]}.
    var rawNode = nodesArr[4];
    rawNode = rawNode.slice(2,-5);
    var group = lookupGroup(groupName);
    //We need a non updating version of this array hence the slice 0
    var existingNodes = group.nodes.slice(0);
    var newNode = getNode(rawNode);
    newNode.addToGroup(group);
    var newEdges = getEdges(group.nodes, existingNodes);
    addNodes([],newEdges);
    recolorNodes([newNode]);
}

function lookupGroup(groupName){
    for(var i = 0; i < groups.length; i++){
	var g = groups[i];
	if(g.name === groupName){
	    return g;
	}
    }
    return -1;
}

function parseRemoveNodes(input) {
    //    "{s_group,'node1@127.0.0.1',remove_nodes,[group1,['node3@127.0.0.1']]}."
    var splitInput = input.split(",");
    var groupName  = splitInput[3].substring(1);
    var nodeName = splitInput[4].slice(2,-5);
    var group = lookupGroup(groupName);
    var node = getNode(nodeName);
    var edgesForRemoval = [];
    group.removeNode(node);
    for(var i = 0; i < group.nodes.length;i++){
	var tNode = group.nodes[i];
	var tEdge = lookupEdge(node,tNode,d3Edges);
	edgesForRemoval.push(tEdge);
    }
    removeElement(group, node.groups);
    var nodesForRemoval = [];
    if(node.groups.length === 0){
	nodesForRemoval.push(node);
    }
    removeNodesAndEdges(nodesForRemoval,edgesForRemoval);
    recolorNodes([node]);
}
