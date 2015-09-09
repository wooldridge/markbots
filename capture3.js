var config = require('./config'),
    raspicam = require('raspicam'),
    marklogic = require('marklogic'),
    fs = require('fs'),
    express = require('express');

var app = express(),
    port = 3001;

app.use(express.static(__dirname + '/'));

var io = require('socket.io').listen(app.listen(port, function () {
    console.log('listening on ' + port);
}));

io.sockets.on('connection', function (socket) {
    socket.emit('message', { message: 'welcome' });
    socket.on('message', function (data) {
        console.log(data.duration);
        io.sockets.emit('message', data);
    });
});

var output = '';
var dateString = '';
config.raspicam.output = output;
var camera = new raspicam(config.raspicam);
var db = marklogic.createDatabaseClient(config.marklogic);

        /* var m = new Date();
        dateString =
          m.getFullYear() +'-'+
          ('0' + (m.getMonth()+1)).slice(-2) +'-'+
          ('0' + m.getDate()).slice(-2) + '_' +
          ('0' + m.getHours()).slice(-2) + '-' +
          ('0' + m.getMinutes()).slice(-2) + '-' +
          ('0' + m.getSeconds()).slice(-2);

        output = './photos/' + dateString + '.jpg';

        camera.set('output', output);

        camera.start(); */



camera.on('start', function(err, timestamp){
  console.log('photo started at ' + timestamp );
});

camera.on('read', function(err, timestamp, filename){
  console.log('photo image captured with filename: ' + filename);
});

camera.on('exit', function(timestamp){
  console.log('start marklogic part...');
  var buffer = fs.readFileSync(output);
  db.documents.write({
    uri: dateString + '.jpg', 
    content: buffer,
    collections: ['photos']
  }).result(
    function(response) {
      console.log('Loaded the following documents:');
      response.documents.forEach( function(document) {
        console.log('  ' + document.uri);
      });
    }, 
    function(error) {
      console.log(JSON.stringify(error, null, 2));
    }
  );
  console.log('photo child process has exited at ' + timestamp);
  camera.stop();
});