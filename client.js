net = require('net');

function Client(host, port){
    this.queue = [];
    this.socket = new net.Socket();
    this.socket.connect(port, host, function() {
        console.log('Connected');
    });

    // Handle errors related to the socket communication 
    this.socket.on('error', function(ex) {
        console.log(ex);
        console.log("Use arrow keys to fly Quad");
    });   
}

Client.prototype.send = function (data){
    this.socket.write(data+'\n');
}

Client.prototype.receive = function (){
    var that = this;
    this.socket.on('data', function(data) {
        data = parseFloat(data);
        console.log(data);
        that.queue.push(data);
    });
}

Client.prototype.disconnect = function (){
    this.socket.on('close', function() {
        console.log('Connection closed');
        this.socket.destroy();
    });
}

module.exports = Client;

// Because this frequently changes when you change the scope by 
// calling a new function, you can't access the original value by 
// using it. Aliasing it to that allows you still to access the original value of this.