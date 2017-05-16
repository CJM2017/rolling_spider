var temporal = require('temporal');
var RollingSpider = require("rolling-spider");

var DRONE_NAME = 'RS ';

var my_drone = new RollingSpider();

my_drone.connect(function() {
	console.log("Trying to connect to spider");
	console.log(my_drone.name);
	my_drone.setup(function() {
  	my_drone.flatTrim();
    my_drone.startPing();
    my_drone.flatTrim();
    
      temporal.queue([
          {
            delay: 5000,
            task: function () {
            	console.log("Takeing off");
              my_drone.takeOff();
              my_drone.flatTrim();
            }
          },
          {
            delay: 3000,
            task: function () {
            	console.log("Landing");
              my_drone.land();
            }
          },
          {
            delay: 5000,
            task: function () {
              temporal.clear();
              process.exit(0);
            }
          }
    ]);
  });

});
