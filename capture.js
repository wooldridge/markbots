var RaspiCam = require("raspicam");
var marklogic = require('marklogic');
var fs = require('fs');

var m = new Date();
var dateString =
  m.getFullYear() +"-"+
  ("0" + (m.getMonth()+1)).slice(-2) +"-"+
  ("0" + m.getDate()).slice(-2) + "_" +
  ("0" + m.getHours()).slice(-2) + "-" +
  ("0" + m.getMinutes()).slice(-2) + "-" +
  ("0" + m.getSeconds()).slice(-2);

var camera = new RaspiCam({
	mode: "photo",
	output: "./photos/" + dateString + ".jpg",
	preview: '0,0,640,480',
	encoding: "jpg",
	timeout: 2000, // millisecs
	verbose: true
});

camera.on("start", function( err, timestamp ){
	console.log("photo started at " + timestamp );
});

camera.on("read", function( err, timestamp, filename ){
	console.log("photo image captured with filename: " + filename );
});

camera.on("exit", function( timestamp ){
	console.log('marklogic part starting...');
	var buffer = fs.readFileSync("./photos/" + dateString + ".jpg");
	var db = marklogic.createDatabaseClient({
		host:	'10.0.0.14',
		port:	'8000',
		user:	'admin',
		password: 'admin',
		authType: 'DIGEST'
	});
	db.documents.write({
		uri: dateString + ".JPG", 
		content: buffer,
		collections: ['photo'],
		properties: { foo: 'bar' }
	}).result(
		function(response) {
			console.log('Loaded the following documents:');
			response.documents.forEach( function(document) {
				console.log('  ' + document.uri);
			});
  		}, 
		function(error) {
			console.log(JSON.stringify(error, null, 2));
		}
	);
	console.log("photo child process has exited at " + timestamp );
	camera.stop();
});

camera.start();