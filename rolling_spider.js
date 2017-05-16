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

// Connect to preexisting socket
guest_socket.receive();

// Handle drone communication 
var my_drone = new RollingSpider();

// Connecting to the Drone
my_drone.connect(function() {
	console.log("Established a connection!");
	console.log(my_drone.name);
	my_drone.flatTrim();
    my_drone.startPing();
    my_drone.flatTrim();
}); 

// make `process.stdin` begin emitting "keypress" events 
Keypress(process.stdin);

// listen for the "keypress" event 
process.stdin.on('keypress', function (ch, key) {
	try 
	{
	  if (key && key.ctrl && key.name == 'c') {
	  	console.log('Quitting Program');
	  	my_drone.land();
	    process.exit();
	  }
	  else if (key && key.name == 'up') {
	  	console.log("Take off!");
	  	my_drone.takeOff();
	    my_drone.flatTrim();
	  }
	  else if (key && key.name == 'down') {
	  	console.log("Landing!");
	  	my_drone.land();
	  }
	}
	catch(err) 
	{
		console.log("Error");
	}
});

process.stdin.setRawMode(true);
process.stdin.resume();
