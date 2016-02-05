var gpsd = require('node-gpsd'),
    spawn = require('child_process').spawn;

/**
 * GPS
 * @constructor
 */
function GPS() {
  this.lat = '';
  this.lon = '';
  this.restart();
}

/**
 * Starts GPSD service after killing any existing GPSD service.
 * @method GPS#restart
 * @see https://github.com/eelcocramer/node-gpsd
 * @see https://learn.adafruit.com/adafruit-ultimate-gps-on-the-raspberry-pi/setting-everything-up
 */
GPS.prototype.restart = function(){
  var killall = spawn('sudo', ['killall', 'gpsd']);
  killall.on('close', function (code) {
    var gpsd = spawn('sudo', ['gpsd', '/dev/ttyUSB0', '-F', '/var/run/gpsd.sock']);
    gpsd.on('close', function (code) {
      var daemon = new gpsd.Daemon();
      daemon.start(function() {
        var listener = new gpsd.Listener({parse: true});
        listener.connect(function() {
          console.log('gpsd connected');
          listener.watch();
          listener.on('TPV', function (data) {
            this.lat = data.lat;
            this.lon = data.lon;
          });
        });
      });
    });
    gpsd.on('error', function (err) {
      console.log('start gps, failed to start child process: ' + err);
    });
  });
  killall.on('error', function (err) {
    console.log('kill existing gps, failed to start child process: ' + err);
  });
}

module.exports = new GPS();
