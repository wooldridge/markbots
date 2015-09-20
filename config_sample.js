var config = {};

config.bot = {
  id: 'BOT_ID' // e.g., 'markbot1'
}

// https://www.raspberrypi.org/documentation/raspbian/applications/camera.md
config.raspicam = {
  mode: "photo",
  preview: '0,0,640,480',
  encoding: "jpg",
  timeout: 2000, // millisecs
  verbose: true
}

config.marklogic = {
  host: 'SERVER.EXAMPLE.COM',
  port:	'8000',
  user:	'USER',
  password: 'PASSWORD',
  authType: 'digest'
}

module.exports = config;
