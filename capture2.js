var config = require('./config'),
    gps = require('./gps'),
    raspicam = require('raspicam'),
    marklogic = require('marklogic'),
    fs = require('fs'),
    raspi = require('raspi-io'),
    five = require('johnny-five'),
    ifaces = require('os').networkInterfaces(),
    uuid = require('node-uuid');

var board = null,
    motion = null,
    led = null,
    socket = null,
    camera = null,
    intervalId = null,
    motionFlag = config.bot.motion,
    ledFlag = false,
    output = config.raspicam.output,
    timestamp = '',
    trigger = '',
    ip = null,
    buffer = null,
    id = null;

// Set IP addresses
if (ifaces.wlan0 && ifaces.wlan0[0]) {
  ip = ifaces.wlan0[0].address.replace(/\./g, '-');
}
else if (ifaces.eth1 && ifaces.eth1[0]) {
  ip = ifaces.eth1[0].address.replace(/\./g, '-');
}

// BOARD SETUP
board = new five.Board({ io: new raspi() });
board.on('ready', function () {

  // MOTION SENSOR SETUP
  motion = new five.Motion('P1-7');
  motion.on('calibrated', function () {
    console.log('calibrated');
  });
  motion.on('motionstart', function () {
    console.log('motion detected, motionFlag = ' + motionFlag);
    if (motionFlag === true) {
      trigger = 'motion';
      captureImage(config.raspicam.timeout);
    }
  });
  motion.on('motionend', function () {
    console.log('motionend');
  });

  // LED SETUP
  led = new five.Led('P1-13');

});

// SOCKET SETUP
socket = require('socket.io-client')(
  'http://'+config.dashboard.host+':'+config.dashboard.port
);
socket.on('connect', function(){
  console.log('connected');
});
// Motion event received, toggle flag
socket.on('motion', function(data){
  console.log('motion received');
  console.dir(data);
  // if ID is this bot, toggle motion
  if (data.id === config.bot.id) {
    trigger = 'socket';
    motionFlag = data.toggle;
    socket.emit('motionUpdate', {id: config.bot.id, status: motionFlag});
    saveData({type: 'heartbeat'});
  }
});
// LED event received, turn on or off based on data received
socket.on('nearby', function(data){
  console.log('nearby received');
  console.dir(data);
  // if ID is this bot, toggle motion
  if (data.id === config.bot.id) {
    trigger = 'socket';
    ledFlag = data.toggle;
    if (ledFlag && data.dist !== null) {
      led.blink(data.dist * 1000);
    } else {
      led.off();
    }
    socket.emit('nearbyUpdate', {id: config.bot.id, status: ledFlag});
  }
});
socket.on('capture', function(data){
  console.log('capture received');
  console.dir(data);
  // if ID is this bot and multi not on, capture image
  if (data.id === config.bot.id && intervalId === null) {
    captureImage(1);
  }
});
socket.on('multi', function(data){
  console.log('multi received');
  console.dir(data);
  // if ID is this bot, start timelapse
  if (data.id === config.bot.id) {
    if (intervalId === null && data.toggle) {
      captureImage(1);
      intervalId = setInterval(function () {
        captureImage(1);
      }, 10000, 'foo');
    } else {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
});

function getTimestamp () {
  var d = new Date();
  return d.toISOString();
}

// CAMERA SETUP
camera = new raspicam(config.raspicam);
camera.on('start', function(err, timestamp){
  console.log('Image capture started at: ' + timestamp );
});
camera.on('read', function(err, timestamp, filename){
  console.log('Image captured with filename: ' + filename);
});
camera.on('exit', function(timestamp){
  console.log('MarkLogic save started at: ' + timestamp);
  buffer = fs.readFileSync(output);
  var base64 = buffer.toString('base64');
  saveData({
    type: 'image',
    format: 'jpeg',
    encoding: 'base64',
    data: base64
  });
  console.log('Image capture child process exited at: ' + timestamp);
  camera.stop();
});
var captureImage = function (timeout) {
  timestamp = getTimestamp();
  output = './images/' + timestamp + '.jpg';
  camera.set('output', output);
  camera.set('timeout', timeout);
  camera.start();
};

// SAVE DATA TO MARKLOGIC
var db = marklogic.createDatabaseClient(config.marklogic);
var saveData = function (payload) {
  id = uuid.v4();
  var json = {
    id: id,
    deviceId: config.bot.id,
    type: payload.type,
    lat: (gps.lat) ? gps.lat : config.bot.lat,
    lon: (gps.lon) ? gps.lon : config.bot.lon,
    timestamp: getTimestamp(),
    ip: ip,
    payload: payload
  };
  db.documents.write({
    uri: id + '.json',
    content: json,
    collections: [payload.type, 'new']
  }).result(
    function(response) {
      console.log('Saved document(s) to MarkLogic:');
      response.documents.forEach( function(document) {
        console.log('  ' + document.uri);
      });
      socket.emit('dataSaved', {id: id});
    },
    function(error) {
      console.log(JSON.stringify(error, null, 2));
    }
  );
};

saveData({type: 'heartbeat'});
setInterval(saveData, config.bot.heartbeat, {type: 'heartbeat'});
