var config = require('./config'),
    gps = require('./gps'),
    raspicam = require('raspicam'),
    marklogic = require('marklogic'),
    fs = require('fs'),
    raspi = require('raspi-io'),
    five = require('johnny-five'),
    ifaces = require('os').networkInterfaces();

var board = null,
    motion = null,
    led = null,
    socket = null,
    camera = null,
    intervalId = null,
    motionFlag = config.bot.motion,
    ledFlag = false,
    output = config.raspicam.output,
    dateString = '',
    trigger = '',
    ip = null,
    buffer = null;

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
      capturePhoto(config.raspicam.timeout);
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
    saveBot();
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
  // if ID is this bot and multi not on, capture photo
  if (data.id === config.bot.id && intervalId === null) {
    capturePhoto(1);
  }
});
socket.on('multi', function(data){
  console.log('multi received');
  console.dir(data);
  // if ID is this bot, start timelapse
  if (data.id === config.bot.id) {
    if (intervalId === null && data.toggle) {
      capturePhoto(1);
      intervalId = setInterval(function () {
        capturePhoto(1);
      }, 10000, 'foo');
    } else {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
});

function getTimestamp () {
  var d = new Date();
  var ts =
    d.getFullYear() +'-'+
    ('0' + (d.getMonth()+1)).slice(-2) +'-'+
    ('0' + d.getDate()).slice(-2) + '_' +
    ('0' + d.getHours()).slice(-2) + '-' +
    ('0' + d.getMinutes()).slice(-2) + '-' +
    ('0' + d.getSeconds()).slice(-2);
  return ts;
}

// CAMERA SETUP
camera = new raspicam(config.raspicam);
camera.on('start', function(err, timestamp){
  console.log('photo started at ' + timestamp );
});
camera.on('read', function(err, timestamp, filename){
  console.log('photo image captured with filename: ' + filename);
});
camera.on('exit', function(timestamp){
  console.log('start marklogic save, timestamp: ' + timestamp);
  buffer = fs.readFileSync(output);
  savePhoto(buffer);
  console.log('photo child process has exited at ' + timestamp);
  camera.stop();
});
var capturePhoto = function (timeout) {
  dateString = getTimestamp();
  output = './photos/' + dateString + '.jpg';
  camera.set('output', output);
  camera.set('timeout', timeout);
  camera.start();
};

// SAVE PHOTO TO MARKLOGIC
var db = marklogic.createDatabaseClient(config.marklogic);
var savePhoto = function (buffer) {
  var uri = dateString + '.jpg';
  // set coords using config defaults if none avail
  var lat = (gps.lat) ? gps.lat : config.bot.lat;
  var lon = (gps.lon) ? gps.lon : config.bot.lon;
  var properties = {
    cat: 'photo',
    uri: uri,
    id: config.bot.id,
    lat: lat,
    lon: lon,
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
      socket.emit('captureUpdate', properties);
    },
    function(error) {
      console.log(JSON.stringify(error, null, 2));
    }
  );
};

// SAVE BOT HEARTBEAT TO MARKLOGIC
var saveBot = function () {
  var m = new Date();
  // set coords using config defaults if none avail
  var lat = (gps.lat) ? gps.lat : config.bot.lat;
  var lon = (gps.lon) ? gps.lon : config.bot.lon;
  dateString = getTimestamp();
  var properties = {
    cat: 'bot',
    id: config.bot.id,
    lat: lat,
    lon: lon,
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
      socket.emit('botUpdate', properties);
    },
    function(error) {
      console.log(JSON.stringify(error, null, 2));
    }
  );
};

saveBot();
setInterval(saveBot, config.bot.heartbeat, 'foo');
