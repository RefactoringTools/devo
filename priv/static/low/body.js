function Time(time) {
	this.time = time;
	queues = new Array();
	activities = new Array();
}
		
function Queue(id, order) {
	this.id = id;
	this.order = order;
	usage = 0;
	takenSpots = new Array();
	sharedNodes = new Array();
}

function Process(a,b,c) {
	this.a = a;
	this.b = b;
	this.c = c;
	queues = new Array();
	previousQueue = -1;
}

function Activity(process, queue){
	this.process = process;
	this.queue = queue;
	thisGap = 0;
}

var testing = false;

//order of the queues on the screen

if (testing){
	//var order = [1,13,3,15,5,17,7,19,9,21,11,23,26,27,0,12,2,14,4,16,6,18,8,20,10,22,25,24];
	//var nodeGroupings = [[1,13],[3,15],[5,17],[7,19],[9,21],[11,23],[26,27],[0,12],[2,14],[4,16],[6,18],[8,20],[10,22],[24,25]];

	var order = [1,13,3,15,5,17,7,19,9,21,11,23,24,0,12,2,14,4,16,6,18,8,20,10,22]; //list of queueIDs.
	var nodeGroupings = [
							[[1,13],[3,15],[5],[17,7],[19]],
							[[9,21],[11,23,24]],
							[[0,12],[2,14],[4,16],[6,18],[8,20],[10,22]]
						];
} else {
	var order = [1,13,3,15,5,17,7,19,9,21,11,23,0,12,2,14,4,16,6,18,8,20,10,22]; //list of queueIDs.
	var nodeGroupings = [
							[[1,13],[3,15],[5,17],[7,19],[9,21],[11,23]],
							[[0,12],[2,14],[4,16],[6,18],[8,20],[10,22]]
						];

}

/*
*	Finds a time object given a value for that time. Returns null if one not found
*/
function getTime(time){
	//console.log(time);
	for (var i = 0; i < times.length; i++){
		if (times[i].time == time){
			//console.log(times[i].time);
			return times[i];
		}
	}
	return null;
}

/*
* Finds a process object given the 3 process id values
*/
function findProcess(a,b,c) {
	for (var i = 0; i < processes.length; i++){
		if ((processes[i].a == a) && (processes[i].b == b) && (processes[i].c == c)){
			//console.log(processes[i].a, processes[i].b, processes[i].c);
			return processes[i];
		}
	}
	return null;

}

/*
*	Finds a queue with the id qId in the collection queues
*/
function getQueue(queues, qId){
	for (var i = 0; i < queues.length; i++){
		if (queues[i].id == qId){
			return queues[i];
		}
	}
	return null;
}

/*
*	Finds a queue order given a id number
*/
function findOrder(id){
	for (var i = 0; i < order.length; i++){
		if (order[i] == id){
			return i;
		}
	}
	return -1;
}

function getQueueFromOrder(orderID){
	return order[orderID];
}

/*
* Performs a logical exclsuive OR
*/
function XOR(a, b){
	return ( a || b ) && !( a && b );
}

/**
*	Removes the given value from the given array
*/
function removeFromArray(arr, value){
	console.log(arr, value);
	var index = arr.indexOf(value);
	if (index != undefined){
		arr.splice(index,1);
		return arr;
	}
	return arr;
}

/*
* Calculates the X cooridnate for a point on the circle 
*/
function calcXValue(cx, rx, ry, order, length, boxSize){
	//return cx + (rx * Math.cos(id * ((2 * Math.PI) / length))) ; //circle
	
	//d = id * ((2 * Math.PI) / length);
	d = calculateAngle(order, length);
	if ((d < (Math.PI / 2)) ||  (d > (3 *Math.PI / 2 ))){
		m = 1;
	} else {
		m = -1;
	}
	//console.log("calcX", order, d, ( m * rx * ry ), Math.sqrt( (rx * rx * Math.tan(d) *  Math.tan(d)) + (ry * ry) ), (( m * rx * ry ) / Math.sqrt( (rx * rx * Math.tan(d) *  Math.tan(d)) + (ry * ry) )) + cx - (boxSize/2));
	return (( m * rx * ry ) / Math.sqrt( (rx * rx * Math.tan(d) *  Math.tan(d)) + (ry * ry) )) + cx - (boxSize/2);
}
			
/*
* Calculates the Y cooridnate for a point on the circle 
*/			
function calcYValue(cy, rx, ry, order, length, boxSize){
	//return cy + (ry * Math.sin(id * ((2 * Math.PI) / length))) - (boxSize/2); //circle
	
	//d = id * ((2 * Math.PI) / length);
	d = calculateAngle(order, length);
	//console.log(id, d);
	if ((d > Math.PI/2) && (d <= (3*Math.PI)/2 ) ){
		m = 1;
	} else {
		m = -1;
	}
	return (( m * rx * ry * Math.tan(d) ) / Math.sqrt( (rx * rx * Math.tan(d) *  Math.tan(d)) + (ry * ry) )) + cy - (boxSize/2);
}

/**
*	Checks whether q1 is in the same core as q2
*/
function sameCoreCheck(q1, q2){
	for (var i = 0; i < nodeGroupings.length; i++){
		for (var j = 0; j < nodeGroupings[i].length; j++) {
			var group = nodeGroupings[i][j];
			//console.log(group, group.indexOf(q1), group.indexOf(q2));
			if ( (group.indexOf(parseInt(q1)) != -1) && (group.indexOf(parseInt(q2)) != -1) ) {
				return true;
			}
		}
	}
	return false;
}

function determineTopology(input) {
	console.log(input);
	var groupings = [];
	var ordering = [];

	var procTextArr = input.split("processor,[");
	
	console.log(procTextArr);

	for (var i = 1; i < procTextArr.length; i++){
		//each processor
		var processor = [];

		//find all cores
		var coreTextArr = procTextArr[i].split("core,[");
		console.log(coreTextArr, coreTextArr.length);

		if (coreTextArr.length != 1) {
			console.log("processor "+i, coreTextArr);

			for (var j = 1; j < coreTextArr.length; j++){
				//each core
				var core = [];

				//find all threads
				var threadTextArr = coreTextArr[j].split("logical,");

				console.log("core "+i, threadTextArr);

				for (var k = 1; k < threadTextArr.length; k++){
					//each thread

					var thread = parseInt(threadTextArr[k].substring(0,1));

					console.log("processor "+i, "core "+j, "thread "+thread);
					core.push(thread);
					ordering.push(thread);
				}
				processor.push(core);
			}
			groupings.push(processor);
		} else {
			console.log("other format");

			

			coreTextArr = procTextArr[i].split("{core,{logical,");
			console.log(coreTextArr, coreTextArr.length);

			for (var j = 1; j < coreTextArr.length; j++){
				//each thread

				var core = [];

				var thread = parseInt(coreTextArr[j]);

				console.log("processor "+i, "core 0", "thread "+thread);
				core.push(thread);
				ordering.push(thread);
				processor.push(core);
				
				console.log(core);
			}			
			console.log(processor);
			groupings.push(processor);
		}

		
	}
	console.log(groupings);
	nodeGroupings = groupings;
	order = ordering;
}

/**
*	-----------------------------------------------------------------------------------------------------
*
*	Actual code
*
*/

var svg = d3.select("svg");

function prepareDrawing() {
	d3.select("#loading").remove();
	
	console.log("preparing");
	//var svg = d3.select("#svgdiv")
	//var svg = d3.select("div")
	var svg = d3.select("#svgdiv")
		.append("svg")
		.attr("width", originalWidth)
		.attr("height", originalHeight)
		.attr("xmlns","http://www.w3.org/2000/svg")
		.attr("version","1.1")
		.attr("id","canvas");

//the following may need modifying

	svg = d3.select("svg");

	var gEnter = svg.selectAll("g")
		.data(order)
		.enter()
		.append("g")
		.attr("id", function(d){
			return "group"+d;
		});
	
	/* 
	*	process id labels
	*/
	gEnter.append("text")
		.text(function (d, i) {
			//console.log(nodeGroupings, d, i);
			return d; // + " a:" + calculateAngle(d.order,order.length);
		})
		.attr("x", function(d,i) {
			return parseInt(calcXValue(cx, rx+(boxSize/2), ry+(boxSize/2), i, order.length, 0));
		})
		.attr("y", function(d,i) {
			return parseInt(calcYValue(cy, rx+(boxSize/2), ry+(boxSize/2), i, order.length, 0));
		})
		.attr("width",40)
		.attr("height",40)
		.attr("text-anchor", "middle")
		.attr("class","queue")
		.attr("id",function(d){
			return "label"+d;
		})
		.append("svg:title")
		.text(function(d) {
			return "Queue: "+d;
		});

//border rectangle
	gEnter.append("rect")
		.attr("width",boxSize)
		.attr("height",boxSize)
		.attr("x", function(d) {
			return parseInt(calcXValue(cx, rx, ry, findOrder(d), order.length, boxSize));
			
		})
		.attr("y", function(d) {
			return parseInt(calcYValue(cy, rx, ry, findOrder(d), order.length, boxSize)); //if circle

		})
		.attr("id",function(d) {
			return "border"+d;
		})
		.attr("class","border")					
		.attr("transform",function(d){
			//return "rotate(" + calculateAngle(d.order,dataset.length) +  ")";
			return "rotate(" + (90 - ((180/Math.PI)*calculateAngle(findOrder(d),order.length)) ) + "," + parseInt(calcXValue(cx, rx, ry, findOrder(d),order.length, boxSize)+(boxSize/2)) + "," + parseInt(calcYValue(cy, rx, ry, findOrder(d), order.length, boxSize)+(boxSize/2)) + ")";
		});

	/**
	*	node grouping labels
	*/

	for (var i = 0; i < nodeGroupings.length; i++) {
		var processor = nodeGroupings[i];
	
		svg.selectAll("ellipse")
			.data(processor, function(d){
				return d;
			})
			.enter()
			.append("ellipse")
			.attr("cx",function (d) {
				//console.log(d.length);
				var firstX = parseInt(d3.select("#label"+d[0]).attr("x"));
				var secondX = parseInt(d3.select("#label"+d[d.length-1]).attr("x"));
				//console.log("x", d[0],firstX,d[1],secondX,(firstX - secondX),((firstX - secondX)/2)+parseFloat(secondX));
			
				//var firstX =  calcXValue(cx, rx, ry, d[0], order.length, boxSize);
				//var secondX =  calcXValue(cx, rx, ry, d[1], order.length, boxSize);
				return parseInt(((firstX - secondX)/2)+parseFloat(secondX))+"";
			})
			.attr("cy",function (d) {
				var firstY = parseInt(d3.select("#label"+d[0]).attr("y"));
				var secondY = parseInt(d3.select("#label"+d[d.length-1]).attr("y"));
				//console.log("y",d[0],firstY,d[1],secondY,(firstY - secondY),((firstY - secondY)/2)+parseFloat(secondY));
				return parseInt(((firstY - secondY)/2)+parseFloat(secondY))+"";
				//return calcYValue(cy, rx, ry, d[0], order.length, boxSize);
			})
			.attr("rx",function (d) {
				return (960/order.length) * (d.length/2);
			})
			.attr("ry",480/order.length)
			.attr("class","grouping")
			.attr("id",function(d) {
				return d[0] + " " + d[1];
			})
			.attr("transform",function(d){
				//return "rotate(" + calculateAngle(d.order,order.length) +  ")";
				var firstAngle = parseInt(90 - ((180/Math.PI)*calculateAngle(findOrder(d[0]),order.length)) );
				var secondAngle = parseInt(90 - ((180/Math.PI)*calculateAngle(findOrder(d[d.length-1]),order.length)) );
				//console.log("id"+d[0], "order"+findOrder(d[0]), firstAngle, "id"+d[1], "order"+findOrder(d[1]), secondAngle, (firstAngle-secondAngle)/2, ((firstAngle - secondAngle)/2)+secondAngle);
				var angle = ((firstAngle - secondAngle)/2)+secondAngle;
				//var angle = secondAngle;
				
				var centreX = ((d3.select("#label"+d[0]).attr("x") - d3.select("#label"+d[d.length-1]).attr("x"))/2)+parseFloat(d3.select("#label"+d[d.length-1]).attr("x"));
				var centreY = ((d3.select("#label"+d[0]).attr("y") - d3.select("#label"+d[d.length-1]).attr("y"))/2)+parseFloat(d3.select("#label"+d[d.length-1]).attr("y"));

				//console.log(d[0], d[1], angle);

				return "rotate(" + angle + "," + parseInt(centreX) + "," + parseInt(centreY) + ")";
			});	
		}
	var xAdjust = 25;
	var yAdjust = 18;

	//Highlighting Each individual node (semi-circles)

	svg.selectAll("path")
	.data(nodeGroupings)
	.enter()
	.append("svg:path")
		.attr("d",function(d, i) {
			
		var first = d[0][0];
		var lastProc = d;
		var lastCore = lastProc[lastProc.length-1];
		var last = lastCore[lastCore.length-1];
		console.log("first", first, "last", last);

			//var startValue = order.length/2;
			//console.log(nodes[0][0], nodes[0][1], nodes[1][0], nodes[1][1]);
			//console.log(getQueueFromOrder(0), parseInt((order.length/2)-1), getQueueFromOrder((order.length/2)-1), getQueueFromOrder((order.length/2)), getQueueFromOrder(order.length-1));
			//console.log(startValue-2, getQueueFromOrder(startValue-2),  order[startValue-2]);
			
			var startX = parseInt(d3.select("#label"+first).attr("x"));
			var startY = parseInt(d3.select("#label"+first).attr("y"));
			var endX = parseInt(d3.select("#label"+last).attr("x"))
			var endY = parseInt(d3.select("#label"+last).attr("y"))

/*			if (startX < endX){
				startX = startX - xAdjust;
				endX = endX + xAdjust;
			} else {
				
				endX = endX - xAdjust;
			}*/

			if (startX > cx){
				startX = startX + xAdjust;
			} else {
				startX = startX - xAdjust;
			}

			if (endX > cx){
				endX = endX + xAdjust;
			} else {
				endX = endX - xAdjust;
			}

			if (startY > cy) {
				startY = startY - yAdjust;
			} else {
				startY = startY + yAdjust;
			}

			if (endY > cy) {
				endY = endY - yAdjust;
			} else {
				endY = endY + yAdjust;
			}

		//	startX = startX+(xStartMultiplier*xAdjust); //12
		//	startY = startY+(yStartMultiplier*yAdjust);
			
		//	endX = endX-(xEndMultiplier*xAdjust); //10
		//	endY = endY+(yEndMultiplier*yAdjust);;
			
			//var pathText = "M " + startX + " " + startY + " L " + cx + " " + cy + " A " + (rx) + "," + (ry) + " 0 1,0 " + endX + "," + endY + " Z";
			var pathText = "M " + startX + " " + startY + " L " + cx + " " + cy + " L " + endX + " " + endY + " A " + (rx+xAdjust) + "," + (ry+yAdjust) + " 0 0 1 " + startX + "," + startY + " ";
			console.log(pathText);
			return pathText;

			//return "M" + startX + " " + startY + " A " + (rx) + "," + (ry) + " 0 1,0 " + endX + "," + endY + " z";
			
			
			//"M50 50 a 60,60 0 1,0 110,100 z"
		})
		.attr("class","nodeArea");
		/*
	svg.append("svg:path")
		.attr("d",function(d) {
			
			//var startValue = (order.length/2)+1;

			var startX = parseInt(d3.select("#label"+getQueueFromOrder(parseInt(order.length/2))).attr("x"))-xAdjust; //13
			var startY = parseInt(d3.select("#label"+getQueueFromOrder(parseInt(order.length/2))).attr("y"))-yAdjust;
			
			var endX = parseInt(d3.select("#label"+getQueueFromOrder(order.length-1)).attr("x"))+xAdjust; //11
			var endY = parseInt(d3.select("#label"+getQueueFromOrder(order.length-1)).attr("y"))-yAdjust;
			
			return "M" + startX + " " + startY + " A " + (rx) + "," + (ry) + " 0 1,0 " + endX + "," + endY + " z";
			
			
			//"M50 50 a 60,60 0 1,0 110,100 z"
		})
		.attr("class","nodeArea");
		*/

	/*
	*	Display time area
	*/
	svg.append("text")
		.text(" ")
		.attr("x", 20)
		.attr("y", 40)
		.attr("id", "time");

}

/*
* Returns the angle for a given queue - in radians
*/
function calculateAngle(itemNum, totalItems){
	return (itemNum * ((2 * Math.PI) / totalItems)) + (Math.PI / totalItems); //+0.13
}

/*
* Calculates the height of a queue box
*/
function calcHeight(usage){
	usage = parseInt(usage);
	if (usage == 0) {
		return 0;
	} else if (usage > 100) {
		useage = 100
	}
	//return (10*Math.log(parseInt(usage)))+5;
	return usage*2;
}

/**
*	Initial start
*/
function start(){
	//prepareDrawing();

}

//the current time
var time = 0;


function parseMigration(input){
		var inputSplit = input.split("[");
		var time = inputSplit[0];
		time = time.substring(1,time.length-1);
		//console.log(0,"input",input);
		//console.log(time);
		alterTime(time);
		var arr = inputSplit[1];
		var migrationsRaw = arr.split("}");
		console.log(arr, migrationsRaw);
		for (var i = 0; i < migrationsRaw.length-2; i++){
			
			var rawMigration;
			var from = "";
			var to = "";
			var size = "";
			if (migrationsRaw[i] == "]"){
				continue;
			} else if(i == 0) {
				rawMigration = migrationsRaw[i].split(",");
				from = rawMigration[0];
				from = parseInt(from.substring(1,from.length))-1;
				to = parseInt(rawMigration[1])-1;
				size = rawMigration[2];

				console.log(rawMigration);
				//rawMigration = migrationsRaw[i].substring[1]
			} else {
				rawMigration = migrationsRaw[i].split(",");
				from = rawMigration[1].trim();
				from = parseInt(from.substring(1,from.length))-1;
				to = parseInt(rawMigration[2])-1;
				size = rawMigration[3];

				console.log(rawMigration, from, to);

			}
			//console.log(i, time, from, to, size);
			migrateProcess(from, to, size);
			
			
		}
}

/*
*	Parses the input and decides which type of data this is
*/
function parse(input){

	//console.log(input+"");
	if (input.substring(0,4) == "{cpu"){
		determineTopology(input); //use this to test
		prepareDrawing(); 
	} else if (input.substring(0,1) == "{"){

		//example
		//{0.400,[{4,1,2}]}. 

		//console.log(input.split("["));

		parseMigration(input);

		//var text = input.split(",");
		//alterTime(text[1]);
		//migrateProcess(text[2], text[3], text[4].substring(0,text[4].length-1));
	} else {
		var text = input.split("  ");
		var time = text[0];
		//console.log(text);
		text = text.slice(1,text.length);
		//console.log(time,text);
		alterQueueSize(text);
		alterTime(time);
	}

}

function alterTime(time){
	d3.select("#time")
		.text(function() {
			return "time: " + time + "s";
		})
		.attr("x", 20)
		.attr("y", 40)
		.attr("id", "time");

}

function alterQueueSize(queues){
	console.log(queues);

	for (var i = 0; i < queues.length; i++){

		var queueID = i;
		var size = queues[i];
		//console.log(queueID, size);

		d3.select("#num"+i).remove();

		/*
		*	Highlight Process Usage
		*/
		d3.select("#group"+queueID)
			.append("rect")
			.attr("width",boxSize)
			.attr("height",function(d) {
				return calcHeight(size);
			})
			.attr("x", function(d) {
				return parseInt(calcXValue(cx, rx+boxSize, ry+boxSize, findOrder(queueID), order.length, boxSize));
				
			})
			.attr("y", function(d) {
			
				return parseInt(calcYValue(cy, rx+boxSize, ry+boxSize, findOrder(queueID), order.length, boxSize) + boxSize); //- calcHeight(d.usage) 

			})
			.attr("id",function(d) {
				return "num"+d;
			})
			.attr("fill",function(d){
				var red = (size * 2);
				if (red > 255) {
					red = 255;
				}
				var green = 255-(size * 2);
				if (green < 0) {
					green = 0;
				}
				return d3.rgb(red,green,0);
				//return "#" + red.toString(16) + "" + green.toString(16) + "00";
			})
			.attr("transform",function(d){
				//return "rotate(" + calculateAngle(d.order,dataset.length) +  ")";
				
				return "rotate(" + (270 - ((180/Math.PI)*calculateAngle( findOrder(queueID),order.length)) ) + "," + 
				parseInt(calcXValue(cx, rx+boxSize, ry+boxSize, findOrder(queueID), order.length, boxSize)+(boxSize/2)) + "," + 
				parseInt(calcYValue(cy, rx+boxSize, ry+boxSize, findOrder(queueID), order.length, boxSize)+(boxSize/2)) + ")";
			})
			.append("svg:title")
			.text(function(d) {
				return ""+parseInt(size);
			});

		if (d3.select("#usage").property("checked")){
			//console.log("abc");
			
			d3.select("#group"+queueID).append("text")
			.text(function(d){
				//console.log(findOrder(queueID), parseInt(findOrder(queueID))-1)
				return size+" " + (parseInt(findOrder(queueID))-1);
			})
			.attr("width",boxSize)
			.attr("height",function(d) {
				return calcHeight(d);
			})
			.attr("x", function(d) {
				return calcXValue(cx, rx+boxSize+10, ry+boxSize+10, findOrder(queueID), order.length, boxSize)+(boxSize/2)-5;
			})
			.attr("y", function(d) {
				return calcYValue(cy, rx+boxSize+10, ry+boxSize+10, findOrder(queueID), order.length, boxSize)+(boxSize/2); //-

			})
			.attr("class","usage");
			//return "abc";
				
		}

	}
}

function migrateProcess(from, to, size){
	console.log(from, to, size);

	var svg = d3.select("svg");

	//var from = d.queue;
	//var to = d.process.queues[previousQueueID];
	//console.log(from, to); //log
	var fromX = parseInt(svg.select("#border"+from).attr("x")) + (boxSize/2);
	var fromY = parseInt(svg.select("#border"+from).attr("y")) + (boxSize/2);
//console.log(fromX, fromY);
//console.log(svg.select("#border"+to));
	var toX = parseInt(svg.select("#border"+to).attr("x")) + (boxSize/2);

	//console.log(fromX, fromY, toX);
	var toY = parseInt(svg.select("#border"+to).attr("y")) + (boxSize/2);

	//console.log(fromX, fromY, toX, toY);

	var dataset = order;

	var centrePoint = Math.abs(findOrder(getQueue(dataset,from)) - findOrder(getQueue(dataset,to)));
	if (findOrder(getQueue(dataset,from)) < findOrder(getQueue(dataset,to))){
		centrePoint = (centrePoint/2) + findOrder(getQueue(dataset,from));
	} else {
		centrePoint = (centrePoint/2) + findOrder(getQueue(dataset,to));
	}

	var centreOptions = [0.2,0.4,0.6,0.8];
	var centreValue = centreOptions[Math.floor(Math.random() * 4)];
	//console.log(centreValue);
	var centreX = calcXValue(cx, rx*centreValue, ry*centreValue, centrePoint, dataset.length, boxSize);
	var centreY = calcYValue(cy, rx*centreValue, ry*centreValue, centrePoint, dataset.length, boxSize);

	var pathData = [{x:fromX, y:fromY},{x:centreX, y:centreY},{x:toX, y:toY}];

	var line = d3.svg.line()
		.x(function (d) { return d.x;} )
		.y(function (d) { return d.y;} )
		.interpolate("cardinal")
		.tension(0.5);

	svg = d3.select("svg").append("svg:path")
		.attr("d", line(pathData))
		.attr("class",function (d) {
			fromCrossing = findOrder(from) >= (dataset.length /2);
			toCrossing = findOrder(to) >= (dataset.length /2);
			//console.log(findOrder(from), findOrder(to), fromCrossing, toCrossing );
			//console.log(from, to, getQueue(dataset, from).sharedNodes, getQueue(dataset, from).sharedNodes.indexOf(to));

			//if the process moves across the node
			if ( XOR(fromCrossing, toCrossing)){
				//console.log("nodeCrossing");
				return "nodeCrossing";
			//if the process moves to the same core
			} else if (sameCoreCheck(from, to))
			{
				return "sameCore";
			} else {
				return "coreCrossing";
			}
		})
		.style("opacity", 1)
		.transition()
		.duration(1500)
		.style("opacity", 0)
		.transition()
		.delay(1500)
		.each("start", function() {
			d3.select(this).remove(); 
			//line.remove();
		});


}