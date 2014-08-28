var svg;
var duration = 1000;
var colors = d3.scale.category10();
var groupMap = new Array();
var colorIterator = 0;
var gradientIdIterator = 0;
var force;
var d3Nodes = [];
var d3Edges = [];
var groups = new Array();
var link,node;
function drawForceGraph(ns,es){
     force = d3.layout.force()
	.size([width,height])
	.linkDistance(100)
	.charge( -1000);
    d3Nodes = force.nodes();
    d3Edges = force.links();
    pushAll(d3Nodes, ns);
    pushAll(d3Edges, es);
    force.on("tick", tickFunction);
    svg = d3.select("#highLevel").append("svg")
	.attr("width",width)
	.attr("height",height);
    link = svg.selectAll(".link");
    node = svg.selectAll(".node");
    refreshForceGraph();
}

function refreshForceGraph(){
    node = node.data(force.nodes(), function(n){return n.name;});
    node
	.enter()
	.append("circle")
	.attr("class",function(d) {return "node " + d.name;})
	.attr("r",20)
	.call(force.drag)
        .append("title").text(function(d){ return d.name;});
    node.exit().remove();

    link = link.data(force.links(), function(l){return l.source.name + "-" + l.target.name;});
    link
	.enter()
	.insert("line", ".node")
	.attr("class","link")
        .attr("source", function(l){return l.source.name;})
        .attr("target", function(l){return l.target.name;})
	.style("stroke","#ccc")
	.style("stroke-width",6)
        .append("title").text("Total messages= 0, total size = 0");
    link.exit().remove();
    d3.selectAll(".node").style("fill", fillCircle);
    force.start();
}

function tickFunction(){
    link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
}

function edgeTitle(e){
    return "Total messages = " + e.totalCount + ", total size = " + e.totalSize;
}

function fillCircle(d){
    var groups = d.groups;
    if (groups.length === 1) {
	return getGroupColor(groups[0]);
    } else {
	var gradientId = "gradient" + gradientIdIterator;
	gradientIdIterator++;
	var gradient = svg.append("svg:defs").append("svg:linearGradient").attr("id",gradientId);
	var step = Math.floor(100/(groups.length-1));
	var gradRange = _.range(0,100,step);
        gradRange.push(100);
	var percents = new Array();
	for(var i = 0;i < gradRange.length; i++){
	    var xArg = "x" + (i+1);
	    var yArg = "y" + (i+1);
	    var percent = gradRange[i] + "%";
	    percents[i] = percent;
	    gradient.attr(xArg,percent).attr(yArg,percent);
	}
	gradient.attr("spreadMethod","pad");
	for(i = 0;i <percents.length;i++){
	    var color = getGroupColor(groups[i]);
	     gradient.append("svg:stop")
		     .attr("offset",percents[i])
		     .attr("stop-color",color)
	             .attr("stop-opacity",1);
	}
	return "url(#" + gradientId + ")";
    }
}

function recolorNodes(nodes){
    for(var i = 0; i < nodes.length; i++){
	var node = nodes[i];
	var fillString = fillCircle(node);
	var svgNode = getSvgNode(node);
	d3.select(svgNode).style("fill", fillString);
    }
}


function getGroupColor(group){
    var groupName = group.name;
    var color;
    if(!(groupName in groupMap)){
	groupMap[groupName] = colorIterator;
	color = colors(colorIterator);
	colorIterator++;
    } else {
	color = colors(groupMap[groupName]);
    }
    return color;
}

function drawEdges(edges){
    var countMax = 0;
    var countMin = Math.pow(2,32) - 1;
    var svgEdges = [];
    for(var i = 0; i < edges.length; i++){
	var currEdge = edges[i];
	var size = currEdge.size;
	svgEdges[i] = getSvgEdge(currEdge);
	if(size > countMax){
	    countMax =size;
	} else if (size < countMin){
	    countMin = size;
	}
    }
    var denom = countMax - countMin;
    for(i = 0; i < edges.length;i++){
	currEdge = edges[i];
	var svgEdge = svgEdges[i];
	var percentOfMax = ((currEdge.size - countMin) / denom).toFixed(2);
	var hueDeg = (1 - percentOfMax) * 120;
	var color = d3.hsl(hueDeg,1,.5).toString();
	d3.select(svgEdge).style("stroke",color);
	$(svgEdge).children("title").text(edgeTitle(currEdge));
    }
}

function getSvgNode(node){
    var circles = d3.selectAll("circle")[0];
    for(var i = 0; i < circles.length; i++){
	var circle = circles[i];
	var text = $(circle).children("title");
	text = text.text();
	if(text === node.name){
	    return circle;
	}
    }
}

function getSvgEdge(edge){
    var sourceName = edge.source.name;
    var targetName = edge.target.name;
    var svgElements = d3.select('[source="'+ sourceName+'"][target="'+targetName+'"]')[0];
    return svgElements[0];
}

function resetEdgeColor(){
    svg.selectAll("line").style("stroke","#ccc");
}


function addNodes(ns,es){
    ns.forEach(function (n){d3Nodes.push(n);});
    es.forEach(function (e){d3Edges.push(e);});
    refreshForceGraph();
}

function removeNodes(nodes) {
    var allNodes = d3Nodes;
    for(var i = 0; i < nodes.length; i++){
	for (var j = 0;j <  allNodes.length; j++){
	    var n = nodes[i];
	    var d3N = allNodes[j];
	    var title = d3N.name; 
	    if(title === n.name){
		removeEdges(n);
		d3Nodes.splice(d3Nodes.indexOf(n),1);
		break;
	    }
	}
    }
    d3Edges = force.links();
}

function removeEdges(node){
    var save = [];
    for(var i = 0; i <d3Edges.length; i++){
	var e = d3Edges[i];
	if(!edgeContainsNode(node,e)){
	    save.push(e);
	}
    }
    force.links(save);
    d3Edges = force.links();
    /*force.links(d3Edges.filter(function (e){
	return !edgeContainsNode(node,e);
    }));*/
}

function removeNodesAndEdges(nodes, edges){
    nodes.forEach(function (n){removeElement(n,d3Nodes);});
    edges.forEach(function (e){removeElement(e,d3Edges);});
    refreshForceGraph();
}
