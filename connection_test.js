var temporal = require('temporal');
var RollingSpider = require("rolling-spider");

var my_drone = new RollingSpider();

my_drone.connect(function() {
 console.log("Established a connection!");
}); 
