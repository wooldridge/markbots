var config = require('./config'),
    marklogic = require('marklogic'),
    fs = require("fs");

// Set up MARKLOGIC
var db = marklogic.createDatabaseClient(config.marklogic);

var files = fs.readdirSync(process.argv[2]);

files.forEach( function(file) {
  console.log(file);

  var id = file.substring(0,19);


  var buffer;
  fs.readFileSync(process.argv[2] + '/' + file, buffer);

  var rnd = Math.random();
  var lat = 38.9243 + (0.0001 * rnd);
  var rnd2 = Math.random();
  var lon = -77.2239 - (0.0001 * rnd2);
  // 38.924300, -77.223982
  // 38.924310, -77.223960
  // 38.924323, -77.223927
  // 38.924338, -77.223913
  // 38.924351, -77.223990
  // 38.924363, -77.223931

  console.log(file.substring(0,19));

    var properties = {
      cat: 'photo',
      uri: file,
      id: 'markbot1',
      lat: lat,
      lon: lon,
      tr: 'motion',
      ts: 0,
      ip: '172.20.10.2'
    };
    db.documents.write({
      uri: file,
      content: buffer,
      collections: ['photos'],
      properties: properties
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



});
