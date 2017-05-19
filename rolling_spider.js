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
var host = '10.0.2.2'; // local IP of host machine from within guest OS
var port = 5000; // Random open port
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

    // Connect to MVS Host Socket
	guest_socket.receive();
    setInterval(function() {analyze_kinect_command(guest_socket);},100);
    //setInterval(function() {console.log(guest_socket.queue.length);},100);
}); 

// Here for TESTING only----------------------------------------------------------
//guest_socket.receive();
//setInterval(function() {analyze_kinect_command(guest_socket.queue);},100);

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
        myDrone.flatTrim();
	  	myDrone.takeOff();
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

function analyze_kinect_command(socket) {
    var leftWristY = socket.queue.pop();
    var rightWristY = socket.queue.pop();
    socket.queue = [];

    // Take off / Landing
    if (leftWristY != null && rightWristY != null) {
        if (leftWristY > 0 && rightWristY > 0) {
            if (previousCommand != 'takeOff') {
                console.log("Take off!");
                myDrone.flatTrim();
                myDrone.takeOff();
                previousCommand = 'takeOff'; 
            }       
        }
        else if (leftWristY < -0.4 && rightWristY < -0.4) {
            if (previousCommand != 'landing') {
                console.log("Landing!");
                myDrone.land();
                previousCommand = 'landing';
            }
        }
    }
}


