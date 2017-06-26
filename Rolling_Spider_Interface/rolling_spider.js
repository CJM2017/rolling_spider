//======================================================
/*	
 *	Project	: Kinect Controlled Rolling Spider
 *	Author	: Connor McCann	
 *	Date	: 15 May 2017
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
var droneState = 'landed';

// Connecting to the Drone
myDrone.connect(function() {
	console.log("Established a drone connection!");
	console.log(myDrone.name);
	myDrone.flatTrim();
    myDrone.startPing();
    myDrone.flatTrim();

    // Send the ready signal to the kinect
    guest_socket.send("ready<EOF>");

    // Connect to MVS Host Socket
	guest_socket.receive();
    setInterval(function() {analyze_kinect_command(guest_socket);},250); // 4Hz poll
}); 

// Here for TESTING only----------------------------------------------------------
//guest_socket.receive();
//setInterval(function() {analyze_kinect_command(guest_socket);},100);

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
    // Wrist left
    var leftWristY = socket.queue.pop();
    var leftWristZ = socket.queue.pop();

    // Wrist right
    var rightWristY = socket.queue.pop();
    var rightWristZ = socket.queue.pop();

    // Spine mid
    var spineMidZ = socket.queue.pop();

    // Yawing metric
    var leftWristOffSpine = spineMidZ-leftWristZ;
    var rightWristOffSpine = spineMidZ-rightWristZ;
    var wristDeltaZ = 100*(leftWristOffSpine-rightWristOffSpine);

    // Empty the queue contained in <guest_socket
    socket.queue = [];

    if (leftWristY != null && rightWristY != null) {
        // Take off
        if (droneState == 'landed' && leftWristY > 0.4 && rightWristY > 0.4) {
            console.log("Take off!");
            myDrone.flatTrim();
            myDrone.takeOff();
            droneState = 'flying'; 
        }
        // Land
        else if (droneState == 'flying' && leftWristY < -0.4 && rightWristY < -0.4) { 
            console.log("Landing!");
            myDrone.land();
            droneState = 'landed';
        }
        // yaw CW
        else if(droneState == 'flying' && wristDeltaZ >= 10) {
            myDrone.turnRight(1,1);
            console.log("Yaw Leftt");
        }
        // Yaw CW
        else if (droneState == 'flying' && wristDeltaZ < -10) {
            myDrone.turnLeft(1,1);
            console.log("Yaw Right");
        }
    }
}


