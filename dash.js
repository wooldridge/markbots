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
  next();
});

// GET photo data
router.get('/photos', function(req, res, next) {
  // params from URL
  var start = req.query.start ? req.query.start : 1,
      length = req.query.length ? req.query.length : 20,
      sort = req.query.sort ? req.query.sort : 'descending',
      tr = req.query.tr ? req.query.tr : '',
      id = req.query.id ? req.query.id : '';
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
  db.documents.query(
    q.where(
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
  socket.on('captureRequest', function (data) {
    console.log('captureRequest');
    console.dir(data);
    io.sockets.emit('capture', data);
  });
  socket.on('motionRequest', function (data) {
    console.log('motionRequest');
    console.dir(data);
    io.sockets.emit('motion', data);
  });
});
