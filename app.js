
var express = require('express');
var	app = express();
var http = require('http');
var server = http.createServer(app);
var port = process.env.PORT || 1212;
var io = require('socket.io').listen(server);
server.listen(port);


if (process.env.REDISTOGO_URL) {
	var rtg   = require("url").parse(process.env.REDISTOGO_URL);
	var	publisher = require("redis").createClient(rtg.port, rtg.hostname);
	var publisher1 = require("redis").createClient(rtg.port, rtg.hostname);
	var subscriber = require("redis").createClient(rtg.port, rtg.hostname);
	var date_subscriber = require("redis").createClient(rtg.port, rtg.hostname);
	publisher.auth(rtg.auth.split(":")[1]);
	publisher1.auth(rtg.auth.split(":")[1]);
	subscriber.auth(rtg.auth.split(":")[1]);
	date_subscriber.auth(rtg.auth.split(":")[1]);
} else {
	var redis = require('redis');
	 publisher = redis.createClient();
	 publisher1 = redis.createClient();
	 subscriber = redis.createClient();
	 date_subscriber = redis.createClient();
}


 subscriber.subscribe('message');
 date_subscriber.subscribe('date');

io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

var pg = require('pg');
var conString =  process.env.DATABASE_URL || "tcp://postgres:password@localhost:5432/mobileCRM";
var _date = '01/01/2999';

/*
pg.connect(process.env.DATABASE_URL, function(err, client) {
	checkDB(_date);
});

*/

console.log('***********************************: ' + process.env.DATABASE_URL);

var client = new pg.Client(conString);
client.connect(function(err) {
  client.query('SELECT NOW() AS "theTime"', function(err, result) {
      console.log(result.rows[0].theTime);
	  checkDB(_date);
      //output: Tue Jan 15 2013 19:12:47 GMT-600 (CST)
  });
});


function checkDB(_date){
		console.log('i m here');
		console.log("SELECT * from offers where created_at > '" + _date+"'");
		var query = client.query("SELECT id, code, playerid, to_char(startdate, 'Mon DD, YYYY') as startdate, to_char(enddate, 'Mon DD, YYYY') as enddate, description, read from offers where created_at > '" + _date+"'");
		query.on('row', function(row){
			publisher.publish('message', JSON.stringify({id: row.id, code:row.code, playerid:row.playerid, startdate:row.startdate, enddate:row.enddate, description:row.description, read:row.read}));
		});
		var query = client.query("SELECT max(to_char(created_at, 'yyyy-mm-dd HH24:MI:SS.US')) as created_at from offers");
		query.on('row', function(row){
			_date = row.created_at;
		});
		date_subscriber.on('message', function(channel, d){
			_date = d;
		});
		console.log('hello');
					
		setTimeout(function() {	
			checkDB(_date);
		}, 5000);
};

 


 
io.sockets.on('connection', function (socket) {
  io.sockets.emit('news', { will: 'be received by everyone'});

    subscriber.on('message' , function(channel,offer_object) {
		socket.emit('new_offer', JSON.parse(offer_object));
	});
		
	socket.on('playerid', function(client){
		console.log(client);
	});
	socket.on('offer', function(client){
		console.log(client);
		_date = client;
		publisher1.publish('date', _date);
		
	});
	socket.on('promotion', function(client){
		console.log(client);
	});
	socket.on('event', function(client){
		console.log(client);
	});
	socket.on('notification', function(client){
		console.log(client);
	});

  socket.on('disconnect', function () {
	io.sockets.emit('user disconnected');
  });
});





