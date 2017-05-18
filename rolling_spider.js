//======================================================
/*	
	Project	: Kinect Controlled Rolling Spider
	Author	: Connor McCann	
	Date	: 15 May 2017
*/
//======================================================
var Keypress = require('keypress');
var Client = require("./client.js");
var RollingSpider = require("rolling-spider");


// Handle the socket connection from Windows Kinect
var host = '10.0.2.2';
var port = 5000;
var guest_socket = new Client(host, port);

// Handle drone communication 
var myDrone = new RollingSpider();
var previousCommand = '';

// Connecting to the Drone
myDrone.connect(function() {
	console.log("Established a connection!");
	console.log(myDrone.name);
	myDrone.flatTrim();
    myDrone.startPing();
    myDrone.flatTrim();

    // Connect to preexisting socket
	guest_socket.receive();
    setInterval(function() {analyze_kinect_command(guest_socket.queue);},100);
}); 

function analyze_kinect_command(dataQueue) {
	var rightWristY = dataQueue.pop();
	if (rightWristY > 0) {
		if (previousCommand != 'takeOff') {
			console.log("Take off!");
			myDrone.takeOff();
			myDrone.flatTrim();
			previousCommand = 'takeOff';
		}
		
	}
	else if (rightWristY < 0) {
		if (previousCommand != 'landing') {
		  	console.log("Landing!");
		  	myDrone.land();
		  	previousCommand = 'landing';
		  }
	  }
}


// make process.stdin begin emitting "keypress" events 
Keypress(process.stdin);

// listen for the "keypress" event 
process.stdin.on('keypress', function (ch, key) {
	try 
	{
	  if (key && key.ctrl && key.name == 'c') {
	  	console.log('Quitting Program');
	  	myDrone.land();
	    process.exit();
	  }
	  else if (key && key.name == 'up') {
	  	console.log("Take off!");
	  	myDrone.takeOff();
	    myDrone.flatTrim();
	  }
	  else if (key && key.name == 'down') {
	  	console.log("Landing!");
	  	myDrone.land();
	  }
	}
	catch(err) 
	{
		console.log("Error");
	}
});

process.stdin.setRawMode(true);
process.stdin.resume();


