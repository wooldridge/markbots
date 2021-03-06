var config = require('./config'),
    marklogic = require('marklogic'),
    express = require('express');

// Set up EXPRESS
var app = express(),
    port = config.dashboard.port,
    router = express.Router();
app.use(express.static(__dirname + '/'));
app.use('/bower_components', express.static(__dirname + '/bower_components'));

// Set up MARKLOGIC
var db = marklogic.createDatabaseClient(config.marklogic);
var q = marklogic.queryBuilder;

// Log requests
router.use(function(req, res, next) {
  console.log('%s %s', req.method, req.url);
  console.dir(req.query);
  next();
});

// Geo functions
var getDistBetwPoints = function (lat1,lon1,lat2,lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    throw new Error("Missing lat/lon param(s)");
  }
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
};

var deg2rad = function (deg) {
  return deg * (Math.PI/180);
};

// GET photo data
router.get('/photos', function(req, res, next) {
  // params from URL
  var start = req.query.start ? req.query.start : 1,
      length = req.query.length ? req.query.length : 20,
      sort = req.query.sort ? req.query.sort : 'descending',
      tr = req.query.tr ? req.query.tr : '',
      id = req.query.id ? req.query.id : '',
      lat1 = req.query.lat1 ? req.query.lat1 : '',
      lon1 = req.query.lon1 ? req.query.lon1 : '',
      lat2 = req.query.lat2 ? req.query.lat2 : '',
      lon2 = req.query.lon2 ? req.query.lon2 : '';
      if (req.query.min) {
        var parts = req.query.min.split('/');
        var min = parts[2] + '-' + parts[0] + '-' + parts[1] + 'T00:00:00-07:00';
      } else {
        var min = '1970-01-01T00:00:00-07:00';
      }
      if (req.query.max) {
        parts = req.query.max.split('/');
        var max = parts[2] + '-' + parts[0] + '-' + parts[1] + 'T00:00:00-07:00';
      } else {
        var max = '2020-12-31T23:59:59-07:00';
      }

  // where clause
  var whereClause = [
      q.collection("photos"),
      q.fragmentScope('properties'),
      // Range minimum
      q.range(
        q.element(q.qname('http://marklogic.com/xdmp/property', 'last-modified')),
        q.datatype('dateTime'),
        '>=',
        min,
        q.fragmentScope('properties')
      ),
      // Range maximum
      q.range(
        q.element(q.qname('http://marklogic.com/xdmp/property', 'last-modified')),
        q.datatype('dateTime'),
        '<=',
        max,
        q.fragmentScope('properties')
      ),
      // Bot ID
      q.range(
        q.element(q.qname('http://marklogic.com/xdmp/json/basic', 'id')),
        q.datatype('string'),
        (id === '') ? '!=' : '=',
        id,
        q.fragmentScope('properties')
      ),
      // Trigger
      q.range(
        q.element(q.qname('http://marklogic.com/xdmp/json/basic', 'tr')),
        q.datatype('string'),
        (tr === '') ? '!=' : '=',
        tr,
        q.fragmentScope('properties')
      )
  ];

  // Add a geospatial constraint if the coords are passed in
  // lat1 - N, lon1 - E, lat2 - S, lon2 - W
  if (lat1 && lon1 && lat2 && lon2) {
    whereClause.push(
      q.propertiesFragment(
        q.geospatial(
          q.geoElementPair(
            q.qname('http://marklogic.com/xdmp/property', 'properties'),
            q.qname('http://marklogic.com/xdmp/json/basic', 'lat'),
            q.qname('http://marklogic.com/xdmp/json/basic', 'lon')
          ),
          q.box(parseFloat(lat2), parseFloat(lon2), parseFloat(lat1), parseFloat(lon1))
        )
      )
    );
  }

  db.documents.query(
    q.where(whereClause)
    // @see http://stackoverflow.com/questions/30091370/marklogic-node-js-sort-on-last-modified
    .orderBy(
      q.sort(
        q.element(q.qname('http://marklogic.com/xdmp/property', 'last-modified')),
        sort
      )
    )
    .withOptions({categories: 'properties'})
    .slice(parseInt(start), parseInt(length))
  )
  .result(function(documents) {
      var results = [];
      documents.forEach(function(document) {
        results.push(document)
      });
      console.log("Result count: " + results.length);
      res.json(results);
      }, function(error) {
        console.dir(error);
    });
});

// GET photo
router.get('/photo', function(req, res, next) {
  // params from URL
  var uri = req.query.uri ? req.query.uri : '';
  db.documents.read(uri)
  .result(function(documents) {
      res.type('application/jpeg');
      res.end(documents[0].content, 'binary');
      }, function(error) {
        console.dir(error);
    });
});

// GET bot data
router.get('/bots', function(req, res, next) {
  // params from URL
  var start = req.query.start ? req.query.start : 1,
      length = req.query.length ? req.query.length : 20,
      sort = req.query.sort ? req.query.sort : 'descending';
  db.documents.query(
    q.where(
      q.collection("bots"),
      q.fragmentScope('properties')
    )
    // @see http://stackoverflow.com/questions/30091370/marklogic-node-js-sort-on-last-modified
    .orderBy(
      q.sort(
        q.element(q.qname('http://marklogic.com/xdmp/property', 'last-modified')),
        sort
      )
    )
    .withOptions({categories: 'properties'})
    .slice(parseInt(start), parseInt(length))
  )
  .result(function(documents) {
      var results = [];
      documents.forEach(function(document) {
        results.push(document)
      });
      console.log("Result count: " + results.length);
      res.json(results);
      }, function(error) {
        console.dir(error);
    });
});

// GET bot
router.get('/bot', function(req, res, next) {
  // params from URL
  var id = req.query.id ? req.query.id : '',
      uri = id + '.json';
  db.documents.read({uris: uri, categories: 'properties'})
  .result(function(documents) {
      res.type('application/json');
      console.dir(documents[0]);
      res.json(documents[0]);
      }, function(error) {
        console.dir(error);
    });
});

// GET nearby bots
router.get('/nearby', function(req, res, next) {
  // params from URL
  var id = req.query.id,
      lat = req.query.lat,
      lon = req.query.lon;
  db.documents.query(
    q.where(
      q.collection("bots"),
      q.propertiesFragment(
        q.geospatial(
          q.geoElementPair(
            q.qname('http://marklogic.com/xdmp/property', 'properties'),
            q.qname('http://marklogic.com/xdmp/json/basic', 'lat'),
            q.qname('http://marklogic.com/xdmp/json/basic', 'lon')
          ),
          q.circle(parseFloat(config.bot.nearby)/5280, parseFloat(lat), parseFloat(lon))
        )
      )
    )
    .withOptions({categories: 'properties'})
  )
  .result(function(documents) {
      console.dir(documents);
      var results = [];
      documents.forEach(function(document) {
        var dist = getDistBetwPoints(
          lat, lon, document.properties.lat, document.properties.lon
        ); // Distance in km
        if (document.properties.id !== id) {
          var item = { id: document.properties.id, dist: dist };
          results.push(item);
        }
      });
      console.log("Result count: " + results.length);
      res.json(results);
      }, function(error) {
        console.dir(error);
    });
});

// DELETE document
router.get('/delete', function(req, res, next) {
  // params from URL
  var id = req.query.id ? req.query.id : '',
      uri = id;
  db.documents.remove(uri)
  .result(function(document) {
      res.type('application/json');
      console.dir(document);
      res.json(document);
      }, function(error) {
        console.dir(error);
    });
});

// Only requests to /api/ will be sent to router.
app.use('/api', router);

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});

var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) {
  console.log('connection established');
  socket.on('multiRequest', function (data) {
    console.log('multiRequest');
    console.dir(data);
    io.sockets.emit('multi', data);
  });
  socket.on('multiUpdate', function (data) {
    console.log('multiUpdate');
    console.dir(data);
    io.sockets.emit('multiUpdate', data);
  });
  socket.on('captureRequest', function (data) {
    console.log('captureRequest');
    console.dir(data);
    io.sockets.emit('capture', data);
  });
  socket.on('captureUpdate', function (data) {
    console.log('captureUpdate');
    console.dir(data);
    io.sockets.emit('captureUpdate', data);
  });
  socket.on('motionRequest', function (data) {
    console.log('motionRequest');
    console.dir(data);
    io.sockets.emit('motion', data);
  });
  socket.on('motionUpdate', function (data) {
    console.log('motionUpdate');
    console.dir(data);
    io.sockets.emit('motionUpdate', data);
  });
  // Handle nearby calcs
  socket.on('botUpdate', function (data) {
    console.log('botUpdate');
    console.dir(data);
    io.sockets.emit('botUpdate', data);
  });
  socket.on('nearby', function (data) {
    console.log('nearby');
    console.dir(data);
    io.sockets.emit('nearby', data);
  });
});
