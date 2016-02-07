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
    ip = null,
    buffer = null,
    id = null,
    now = null,
    ledFlag = false,
    motionFlag = config.bot.motion,
    output = config.raspicam.output,
    captureTime = '',
    saveTime = '',
    trigger = '',
    base64 = '';

/*
 * IP ADDRESS
 */
if (ifaces.wlan0 && ifaces.wlan0[0]) {
  ip = ifaces.wlan0[0].address;
}
else if (ifaces.eth1 && ifaces.eth1[0]) {
  ip = ifaces.eth1[0].address;
}

/*
 * BOARD
 */
board = new five.Board({ io: new raspi() });
board.on('ready', function () {

  /*
   * MOTION SENSOR
   */
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

  /*
   * LED
   */
  led = new five.Led('P1-13');

});

/*
 * SOCKET
 */
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
  }
});
// LED event received, turn on or off
socket.on('nearby', function(data){
  console.log('nearby received');
  console.dir(data);
  // if ID is this bot, toggle LED
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
// Capture event received, capture image
socket.on('capture', function(data){
  console.log('capture received');
  console.dir(data);
  // if ID is this bot and multi not on
  if (data.id === config.bot.id && intervalId === null) {
    captureImage(1);
  }
});
// Multi event received, capture image
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

/*
 * CAMERA
 */
camera = new raspicam(config.raspicam);
camera.on('start', function(err, timestamp){
  console.log('Image capture started at: ' + timestamp);
});
camera.on('read', function(err, timestamp, filename){
  console.log('Image captured with filename: ' + filename);
});
camera.on('exit', function(timestamp){
  try {
    console.log('MarkLogic save started at: ' + timestamp);
    buffer = fs.readFileSync(output);
    base64 = buffer.toString('base64');
    saveData({
      type: 'image',
      format: 'jpeg',
      encoding: 'base64',
      data: base64
    }, {
      ts: captureTime
    });
    console.log('Image capture child process exited at: ' + timestamp);
    camera.stop();
  } catch (err) {
    console.dir(err);
  }
});
function captureImage (timeout) {
  now = new Date();
  captureTime = now.toISOString();
  output = './images/' + captureTime + '.jpg';
  camera.set('output', output);
  camera.set('timeout', timeout);
  camera.start();
};

/*
 * DATABASE
 */
var db = marklogic.createDatabaseClient(config.marklogic);
function saveData (data, opts) {
  id = uuid.v4() + '.json';
  now = new Date();
  saveTime = now.toISOString();
  var json = {
    id: id,
    dev: config.bot.id,
    loc: {
      lat: (gps.lat) ? gps.lat : config.bot.lat,
      lon: (gps.lon) ? gps.lon : config.bot.lon
    },
    ts: saveTime,
    ip: ip,
    data: data
  };
  // Override with any opts
  for (var prop in opts) { json[prop] = opts[prop]; }
  db.documents.write({
    uri: id,
    content: json,
    collections: [data.type]
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

/*
 * HEARTBEAT
 */
saveData({type: 'heartbeat'});
setInterval(saveData, config.bot.heartbeat, {type: 'heartbeat'});
