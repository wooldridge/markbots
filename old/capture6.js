var config = require('./config'),
    raspicam = require('raspicam'),
    marklogic = require('marklogic'),
    gpsd = require('node-gpsd'),
    fs = require('fs')
    raspi = require('raspi-io'),
    five = require('johnny-five'),
    express = require('express');

// Set up MOTION
var motion = false;
var board = new five.Board({
    io: new raspi()
});

// Set up CAMERA
var output = '';
var dateString = '';
config.raspicam.output = output;
var camera = new raspicam(config.raspicam);
var db = marklogic.createDatabaseClient(config.marklogic);

// Set up GPS
var daemon = new gpsd.Daemon();
var gps = {};

// CAMERA events
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

// GPS events
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

// MOTION events
board.on('ready', function () {
    console.log('board is ready');

    var motion = new five.Motion('P1-7');

    motion.on('calibrated', function () {
      console.log('calibrated');
    });

    motion.on('motionstart', function () {
      console.log('motionstart');
      if (motion) {
        capturePhoto();
      }
    });

    motion.on('motionend', function () {
      console.log('motionend');

    });

});

// CAPTURE PHOTO
var capturePhoto = function () {
  var m = new Date();
  dateString =
      m.getFullYear() +'-'+
      ('0' + (m.getMonth()+1)).slice(-2) +'-'+
      ('0' + m.getDate()).slice(-2) + '_' +
      ('0' + m.getHours()).slice(-2) + '-' +
      ('0' + m.getMinutes()).slice(-2) + '-' +
      ('0' + m.getSeconds()).slice(-2);

  output = './photos/' + dateString + '.jpg';

  camera.set('output', output);

  camera.start();
};

// SAVE PHOTO TO MARKLOGIC

