var config = require('./config'),
    raspicam = require('raspicam'),
    marklogic = require('marklogic'),
    gpsd = require('node-gpsd'),
    fs = require('fs');

var m = new Date();
var dateString =
  m.getFullYear() +'-'+
  ('0' + (m.getMonth()+1)).slice(-2) +'-'+
  ('0' + m.getDate()).slice(-2) + '_' +
  ('0' + m.getHours()).slice(-2) + '-' +
  ('0' + m.getMinutes()).slice(-2) + '-' +
  ('0' + m.getSeconds()).slice(-2);

var output = './photos/' + dateString + '.jpg';
config.raspicam.output = output;

var camera = new raspicam(config.raspicam);
var db = marklogic.createDatabaseClient(config.marklogic);

var daemon = new gpsd.Daemon();

var gps = {};

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
    collections: ['photos'],
    properties: {lat: gps.lat, lon: gps.lon}
  }).result(
    function(response) {
      console.log('Loaded the following documents:');
      response.documents.forEach( function(document) {
        console.log('  ' + document.uri);
      });
      console.dir(gps);
    }, 
    function(error) {
      console.log(JSON.stringify(error, null, 2));
    }
  );
  console.log('photo child process has exited at ' + timestamp);
  camera.stop();
});

daemon.start(function() {
    var listener = new gpsd.Listener({parse: true});
    listener.connect(function() {
        console.log('gpsd connected');
        listener.watch();
        listener.on('TPV', function (data) {
          gps = data;
        });
    });
});

camera.start();