var config = {};

config.bot = {
  id: 'BOT_ID' // e.g., 'markbot1'
}

// https://www.raspberrypi.org/documentation/raspbian/applications/camera.md
config.raspicam = {
  mode: "photo",
  preview: '0,0,640,480',
  encoding: "jpg",
  timeout: 1000, // millisecs
  verbose: true
}

// Where is MarkLogic running?
config.marklogic = {
  host: 'SERVER.EXAMPLE.COM',
  port:	'8000',
  user:	'USER',
  password: 'PASSWORD',
  authType: 'digest'
}

// Where is the dashboard running?
config.dashboard = {
  host: 'SERVER.EXAMPLE.COM',
  port: '3000'
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = config;
}
