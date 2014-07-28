var svg;
var duration = 1000;
var colors = d3.scale.category10();
var groupMap = new Array();
var colorIterator = 0;
var gradientIdIterator = 0;
var force;
var d3Nodes;
var d3Edges;

function drawForceGraph(ns,es){
    force = d3.layout.force()
       .size([width,height])
       .linkDistance([100])
       .charge([-1000]);
    svg = d3.select("#highLevel").append("svg")
	    .attr("width",width)
	    .attr("height",height);
    d3Nodes = ns;
    d3Edges = es;
    refreshForceGraph();
}

function refreshForceGraph(){
    $("svg").empty();
    force = force
	.nodes(d3Nodes)
	.links(d3Edges)
	.start();
    var edges = svg.selectAll("line")
       .data(d3Edges)
       .enter()
       .append("line")
       .style("stroke","#ccc")
       .style("stroke-width",6)
       .attr("source", function(e){return e.source.name;})
       .attr("target", function(e){return e.target.name;});
    edges.append("title").text("Total messages= 0, total size = 0");
    var nodes = svg.selectAll("circle")
       .data(d3Nodes)
       .enter()
       .append("circle")
       .attr("r",20)
       .style("fill", fillCircle)
       .call(force.drag);
    nodes.append("title").text(function(d){ return d.name;});
    force.on("tick", function(){
      edges.attr("x1", function(d) { return d.source.x; })
           .attr("y1", function(d) { return d.source.y; })
           .attr("x2", function(d) { return d.target.x; })
           .attr("y2", function(d) { return d.target.y; });

      nodes.attr("cx", function(d) { return d.x; })
           .attr("cy", function(d) { return d.y; });
      });
    
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
    var svgElements = svg.select('[source="'+ sourceName+'"][target="'+targetName+'"]')[0];
    return svgElements[0];
}

function resetEdgeColor(){
    svg.selectAll("line").style("stroke","#ccc");
}


function addNodes(ns,es){
    d3Nodes = d3Nodes.concat(ns);
    d3Edges = d3Edges.concat(es);
    refreshForceGraph();
}
function findNodeStartX(d, i, multiplierSet){
	var cols = Math.round(Math.sqrt(nodesInRegion(d.region).length));

	//console.log(cols, d.label);
	//console.log((i % cols)+1, i, cols, nodes.length, d.region.width, (d.region.width / (cols + 1)));
	var cx = ( ((i % cols)+1) * (d.region.width / (cols + 1)) ) + d.region.x;
	 //var cx = (Math.random() * d.region.width) + d.region.x;
	if (multiplierSet){
		d.x = cx* multiplier;
	} else {
		d.x = cx;
	}
	
	//console.log("x", d);
	return parseInt(d.x) ;
}


function findNodeStartY(d, i, multiplierSet){

	var cols = Math.round(Math.sqrt(nodesInRegion(d.region).length));

	var i = nodesInRegion(d.region).indexOf(d);

	var cy = ((Math.floor(i / cols)+1) * (d.region.height / (cols + 1))) + d.region.y;

	if (multiplierSet){
		d.y = cy* multiplier;
	} else {
		d.y = cy;
	}
	return parseInt(d.y);
}

function addNode(node) {
	console.log("drawing node: ", node, node.x, node.y, node.label);

	d3.select("svg").append("circle")
		.attr("r",0)
		.attr("cx",node.x)
		.attr("cy",node.y)
		.attr("id", node.label)
		.attr("class","node")
		.style("fill", "green")
		.transition()
		.attr("r", 5 * 4)
		.duration(3*duration/4)
		.transition()
		.delay(3*duration/4)
		.attr("r", 5)
		.duration(duration/4)
		.style("fill", "blue");
		//.append("svg:title")
        //.text(node.label);

}

function removeNodes(nodes) {
    var allNodes = svg.selectAll("circle")[0];
    for(var i = 0; i < nodes.length; i++){
	for (var j = 0;j <  allNodes.length; j++){
	    var n = nodes[i];
	    var svgN = allNodes[j];
	    var title = $(svgN).children("title").text();
	    if(title === n.name){
		svgN.remove();
		removeEdges(n);
		d3Nodes.splice(d3Nodes.indexOf(n),1);
		break;
	    }
	}
    }
    force.start();
}

function removeEdges(node){
    svg.selectAll('line[source="'+node.name+'"]').remove();
    svg.selectAll('line[target="'+node.name+'"]').remove();
    d3Edges = d3Edges.filter(function (e){
	return !edgeContainsNode(node,e);
    });
}
