/*
Streams of social  consciousness
Real-time data transformation

In this talk I explain how to use Node.js streams to parse and transform real-time data. If you are curious about streams but never managed to get going due to lack of time or lack of clear direction, this is the talk for you. I will provide a quick introduction to streams and show how to use streams to build a chained flow for your data to pass through. I will take advantage of the twitter API to show how tweets can be piped through a sentiment analysis and feed a real-time visualisation of the social mood of the moment. I will also briefly discuss the positive impact that the use of streams tend have on your coding practices (separation of concerns, mini-modules, functional programming).
*/

var express = require("express"),
    TwitterSentiments = require('./twitter-sentiments');

var app = express.createServer();    
port = 3000;
initSocket(port); 

app.set('views', __dirname + '/views');
app.set("view options", {layout: false});
app.set('view engine', 'ejs');

app.get("/", function(req, res){
	// var agent =  req.headers['user-agent'];
    res.render("home", {
		words: req.query.words || ""
    });
});

app.use(express.static(__dirname + '/public'));

function initSocket(port) {
	var io = require('socket.io').listen(app.listen(port));
	io.set('log level', 1);
	io.sockets.on('connection', function (socket) {
		initSocketCommands(socket);
		socket.emit('twitterReady');
	});
}

function initSocketCommands(browserSocket) {

	var twitter;

	var cmd = {};
	cmd.startMonitoring = function(data) {
		if(!twitter) { twitter = TwitterSentiments.getInstance('userAgent'); }
    	twitter.monitor(data.filters);
	};
	cmd.stopMonitoring = function() {
		if(!twitter) { return; }
		twitter.stop();
	};

	cmd.trackZone = function(data) {
		if(!twitter) { return; }
		twitter.trackZone(data.zone, function(data) {
			browserSocket.emit('zoneData', data); 
		});
	};

	browserSocket.on('browserCommand', function(data) {
		var fn = cmd[data.command];
		if(fn && typeof fn === 'function') { fn(data); }
	});

}

