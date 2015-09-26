var config = require('./config'),
    raspicam = require('raspicam'),
    spawn = require('child_process').spawn,
    marklogic = require('marklogic'),
    gpsd = require('node-gpsd'),
    fs = require('fs')
    raspi = require('raspi-io'),
    five = require('johnny-five'),
    express = require('express')
    ifaces = require('os').networkInterfaces();

// Set IP addresses
var ip = null;
if (ifaces.wlan0 && ifaces.wlan0[0]) {
  ip = ifaces.wlan0[0].address.replace(/\./g, '-');
}
else if (ifaces.eth1 && ifaces.eth1[0]) {
  ip = ifaces.eth1[0].address.replace(/\./g, '-');
}

// Set up EXPRESS
var app = express(),
    port = 3001;
app.use(express.static(__dirname + '/'));

// Set up SOCKET.IO
// var io = require('socket.io').listen(app.listen(port, function () {
//     console.log('listening on ' + port);
// }));
var socket = require('socket.io-client')(
  'http://'+config.dashboard.host+':'+config.dashboard.port
);
socket.on('connect', function(){
  console.log('connected');
});
socket.on('capture', function(data){
  console.log('capture received');
  console.dir(data);
  // if ID is this bot, capture photo
  if (data.id === config.bot.id) {
    trigger = 'socket'
    capturePhoto();
  }
});
socket.on('motion', function(data){
  console.log('motion received');
  console.dir(data);
  // if ID is this bot, toggle motion
  if (data.id === config.bot.id) {
    trigger = 'socket'
    motionFlag = !motionFlag;
    socket.emit('motionUpdate', {id: config.bot.id, status: motionFlag});
    saveBot();
  }
});

// Set up MOTION
var motionFlag = true;
var board = new five.Board({
    io: new raspi()
});

// Set up CAMERA
var output = '';
var dateString = '';
var trigger = '';
config.raspicam.output = output;
var camera = new raspicam(config.raspicam);

// Set up MARKLOGIC
var db = marklogic.createDatabaseClient(config.marklogic);

// Set up GPS
// To reset GPS:
//   sudo killall gpsd
//   sudo gpsd /dev/ttyUSB0 -F /var/run/gpsd.sock
var gps = {};
var killall = spawn('sudo', ['killall', 'gpsd']);
killall.on('close', function (code) {
  console.log('kill existing gps, child process exited with code: ' + code);
  // sudo gpsd /dev/ttyUSB0 -F /var/run/gpsd.sock
  var gpsd = spawn('sudo', ['gpsd', '/dev/ttyUSB0', '-F', '/var/run/gpsd.sock']);
  gpsd.on('close', function (code) {
    console.log('start gps, child process exited with code: ' + code);
  });
  gpsd.on('error', function (err) {
    console.log('start gps, failed to start child process: ' + err);
  });
});
killall.on('error', function (err) {
  console.log('kill existing gps, failed to start child process: ' + err);
});
var daemon = new gpsd.Daemon();

// CAMERA events
camera.on('start', function(err, timestamp){
  console.log('photo started at ' + timestamp );
});

camera.on('read', function(err, timestamp, filename){
  console.log('photo image captured with filename: ' + filename);
});

camera.on('exit', function(timestamp){
  console.log('start marklogic part...');
  console.log('timestamp: ' + timestamp);
  var buffer = fs.readFileSync(output);
  savePhoto(buffer);
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
    console.log('motionFlag: ' + motionFlag);
    if (motionFlag === true) {
      trigger = 'motion';
      capturePhoto();
    }
  });

  motion.on('motionend', function () {
    console.log('motionend');
  });

});

// SOCKET.IO events
// io.sockets.on('connection', function (socket) {
//   socket.emit('message', { message: 'socket.io connection' });
//   socket.on('getPhoto', function (data) {
//     console.log('photo event');
//     trigger = 'socket';
//     capturePhoto();
//   });
//   socket.on('getGps', function (data) {
//     console.log('gps event');
//     io.sockets.emit('gps', {coords: 'lat: ' + gps.lat + ' lon: ' + gps.lon});
//   });
//   socket.on('toggleMotion', function (data) {
//     console.log('toggle motion event');
//     motionFlag = !motionFlag;
//     io.sockets.emit('motion', {value: motionFlag});
//   });
//   socket.on('resetGps', function (data) {
//     console.log('gps reset');
//     // sudo killall gpsd
//     var killall = spawn('sudo', ['killall', 'gpsd']);
//   	killall.on('close', function (code) {
//       console.log('child process exited with code: ' + code);
//       // sudo gpsd /dev/ttyUSB0 -F /var/run/gpsd.sock
//       var gpsd = spawn('sudo', ['gpsd', '/dev/ttyUSB0', '-F', '/var/run/gpsd.sock']);
//   	  gpsd.on('close', function (code) {
//         console.log('child process exited with code: ' + code);
//       });
//   	  gpsd.on('error', function (err) {
//         console.log('failed to start child process: ' + err);
//       });
//     });
//   	killall.on('error', function (err) {
//       console.log('failed to start child process: ' + err);
//     });
//   });
// });

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
var savePhoto = function (buffer) {
  var uri = dateString + '.jpg';
  var properties = {
    cat: 'photo',
    uri: uri,
    id: config.bot.id,
    lat: gps.lat,
    lon: gps.lon,
    tr: trigger,
    ts: dateString,
    ip: ip
  };
  db.documents.write({
    uri: uri,
    content: buffer,
    collections: ['photos'],
    properties: properties
  }).result(
    function(response) {
      console.log('Loaded the following documents:');
      response.documents.forEach( function(document) {
        console.log('  ' + document.uri);
      });
      socket.emit('captureUpdate', {properties});
    },
    function(error) {
      console.log(JSON.stringify(error, null, 2));
    }
  );
};

// SAVE BOT HEARTBEAT TO MARKLOGIC
var saveBot = function () {
  var m = new Date();
  dateString =
    m.getFullYear() +'-'+
    ('0' + (m.getMonth()+1)).slice(-2) +'-'+
    ('0' + m.getDate()).slice(-2) + '_' +
    ('0' + m.getHours()).slice(-2) + '-' +
    ('0' + m.getMinutes()).slice(-2) + '-' +
    ('0' + m.getSeconds()).slice(-2);

  var properties = {
    cat: 'bot',
    id: config.bot.id,
    lat: gps.lat,
    lon: gps.lon,
    ts: dateString,
    ip: ip,
    mot: motionFlag
  };
  db.documents.write({
    uri: config.bot.id + '.json',
    content: properties,
    collections: ['bots'],
    // save bot data as properties same as photos so we can retrieve similarly
    properties: properties
  }).result(
    function(response) {
      console.log('Loaded the following documents:');
      response.documents.forEach( function(document) {
        console.log('  ' + document.uri);
      });
      // io.sockets.emit('photo', {
      //   filename: dateString + '.jpg',
      //   url: 'http://' + config.marklogic.host + ':' +
      //        config.marklogic.port + '/v1/documents?uri=' +
      //        dateString + '.jpg'
      // });
    },
    function(error) {
      console.log(JSON.stringify(error, null, 2));
    }
  );
};

saveBot();
setInterval(saveBot, config.bot.heartbeat, 'foo');
