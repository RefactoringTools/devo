/** A labelled circle */
function Circle(id,label,r,x,y) {
	this.id = id;
	this.label = label;
	this.r = r;
	this.x = x;
	this.y = y;
	newCircle = false;
	moved = false;
	svg = null;
	labelSvg = null;
}


function Rectangle(x,y,width,height) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.label = "";
}

function Point(x,y) {
	this.x = x;
	this.y = y;
}


function Node(label,region, regionText){
	this.label = label;
	x = 0.0;
	y = 0.0;
	this.region = region; //rectangle
	this.regionText = regionText;
	horizontal = 0;
	vertical = 0;
	newNode = false;
}
function Node2(name, s_group){
    this.name = name;
    this.groups = [s_group];
    s_group.addNode(this);
    this.addToGroup = function (group) {this.groups.push(group); group.addNode(this);};
    this.isInGroup = function (g) {return $.inArray(g, this.groups) > -1;};
}

function compareNodes(node1,node2){
    if(node1.name < node2.name){
	return -1;
    }
    if (node1.name > node2.name){
	return 1;
    }
    return 0;
}

function compareEdges(edge1,edge2){
    var sourceCompare = compareNodes(edge1.source,edge2.source);
    if( sourceCompare === 0){
	return compareNodes(edge1.target,edge2.target);
    }
    return sourceCompare;
    

}

function S_group(name) {
    this.name = name;
    this.nodes= [];
    this.addNode = function (node){this.nodes.push(node);};
    this.bothNodesInGroup= function(n1,n2){
	var n1Member = $.inArray(n1, this.nodes) > -1;
	var n2Member = $.inArray(n2, this.nodes) > -1;
	return n1Member && n2Member;
    };
    this.removeNode = function (node) {
	this.nodes = this.nodes.filter(
	    function(n){
		return !(n === node);
	    });
    };
}
function Edge(node1, node2, size){
        this.source = node1;
        this.target = node2;
	this.size = size;
        this.totalCount = 0;
        this.totalSize = 0;
}

function lookupEdge(node1, node2, edges){
    for(var i = 0; i < edges.length;i++){
	var e = edges[i];
	if (isNodeEdge(node1,node2, e)){
	    return e;
	}
    }
    return -1;
}

function isNodeEdge(node1,node2,edge){
    return edgeContainsNode(node1,edge) && edgeContainsNode(node2,edge);
}

function edgeContainsNode(node,edge){
    var res = (edge.source === node) || (edge.target === node);
    return res;
}
function Time(time){
	this.time = time;
	this.interactions = [];
}

function Interaction(start, end, size){
	this.start = start;
	this.end = end;
	this.size = size;
}


function removeDuplicates(arr) {
	var result = [];
	$.each(arr, function(i, el){
    	if($.inArray(el, result) === -1) result.push(el);
	});
	return result;
}

/*
Finds a circle given a label
 */
function findCircleLabel(label){
	for (var i = 0; i < circles.length; i++){
		if (label == circles[i].label){
			return circles[i];
		}
	}
	return null;
}

/*
Finds a circle given a id
 */
function findCircleId(id){
	for (var i = 0; i < circles.length; i++){
		if (id == circles[i].id){
			return circles[i];
		}
	}
	return null;
}

/*
Finds all circles given a id
 */
function findAllCirclesId(id){
	var output = [];
	for (var i = 0; i < circles.length; i++){
		if (id == circles[i].id){
			output.push(circles[i]);
		}
	}
	return output;
}

/*
Finds all circles given a id
 */
function findAllCirclesId(id, list){
	var output = [];
	for (var i = 0; i < list.length; i++){
		if (id == list[i].id){
			output.push(list[i]);
		}
	}
	return output;
}

/*
Finds all circles given a label
 */
function findAllCirclesLabel(label, list){
	var output = [];
	for (var i = 0; i < list.length; i++){
		if (label == list[i].label){
			output.push(list[i]);
		}
	}
	return output;
}

/*
Finds a circle with a given ID that hasn't moved
 */
function findCircleIdHaventMoved(id, list){
	for (var i = 0; i < circles.length; i++){
		if (id == circles[i].id && !circles[i].moved){
			return circles[i];
		}
	}
}


/*
Finds a rectangle given a label
*/
function findRectangleFromLabel(label, rectangles){

	for (var i = 0; i < rectangles.length; i++){
		if (label.trim() == rectangles[i].label.trim()){
			return rectangles[i];
		}
	}
}

/*
Finds all rectangles given a label
*/
function findAllRectanglesFromLabel(label, rectangles){
	var output = [];
	for (var i = 0; i < rectangles.length; i++){
		if (label.trim() == rectangles[i].label.trim()){
			output.push(rectangles[i]);
		}
	}
	return output;
}

/*
Finds a node given a label
*/
function findNode(label, nodes){
	for (var i = 0; i < nodes.length; i++){
		//console.log(nodes[i].label,label, nodes[i].label == label);
		if (nodes[i].name == label) {
			return nodes[i];
		}
	} 
	return null;
}

function stringCompare(s1, s2){
	console.log(s1.length,s2.length, s1.charAt(1));
	if (s1.length != s2.length){
		return false;
	}
	for (var i = 0; i < s1.length; i++){
		//console.log(s1.charAt(i),s2.charAt(i));
		if (s1.charAt(i) != s2.charAt(i)){
			return false;
		}
	}
	return true;

}

// Generates a hash for creating unqiue circle or node IDs
//not used
function generateHash(s){
	return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
}

/*
* Finds if two circles intersect
*/
function twoCirclesIntersect(c1, c2){
	var distance = Math.sqrt( Math.pow(c1.x - c2.x, 2) + Math.pow(c1.y - c2.y,2) );
	//console.log("comparing", c1, c2, c1.r, c2.r, distance, distance <= c1.r + c2.r);
	return (distance <= c1.r + c2.r);
}

function pushAll(arr1, arr2){
    arr2.forEach(function (e){arr1.push(e);});
}

/**
Removes from arr1 every element in arr2
*/
function removeAll(arr1, arr2){
	var result = [];
	for (var i = 0; i < arr1.length; i++){
		var index = arr2.indexOf(arr1[i]);

		//if this element isn't in arr2, then add it to result
		if (index == -1) {
			result.push(arr1[i]);
		}
	}
	return result;

}

/**
Finds the next free is for a circle
*/
function findNextCircleKey(circles) {
	for (var i = 65; i < 123; i++) {
		var found  = false;
		for (var j = 0; j < circles.length; j++){
			var c = circles[j];
			//console.log(c.id.charCodeAt(0), i);
			if (c.id.charCodeAt(0) == i) {
				found = true;
				break;
			}
		}
		if (!found) {
			return String.fromCharCode(i);
		}
	}
}

function removeElement(elem, arr){
    var index;
    for(var i = 0; i<arr.length;i++){
	var temp = arr[i];
	if (temp === elem){
	    index = i;
	}
    }
    arr.splice(index,1);
}
