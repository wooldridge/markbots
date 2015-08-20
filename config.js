var config = {};

// https://www.raspberrypi.org/documentation/raspbian/applications/camera.md
config.raspicam = {
  mode: "photo",
  preview: '0,0,640,480',
  encoding: "jpg",
  timeout: 2000, // millisecs
  verbose: true
}

config.marklogic = {
  host:	'10.0.0.14',
  port:	'8000',
  user:	'admin',
  password: 'admin',
  authType: 'digest'
}

module.exports = config;