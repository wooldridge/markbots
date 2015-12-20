var config = require('./config'),
    marklogic = require('marklogic'),
    fs = require("fs");

// Set up MARKLOGIC
var db = marklogic.createDatabaseClient(config.marklogic);

var file = process.argv[2];
var path = './summit/' + file;
var id = process.argv[2].substring(0,19);

console.log(path);

var buffer;

fs.readFile(path, function (err, data) {

//38.932246,-77.219085
  var rnd = Math.random();
  var lat = 38.932246 + (0.0002 * rnd);
  var rnd2 = Math.random();
  var lon = -77.219085 - (0.0003 * rnd2);
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
    content: data,
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

