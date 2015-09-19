var config = require('./config'),
    marklogic = require('marklogic'),
    express = require('express');

// Set up EXPRESS
var app = express(),
    port = 3000,
    router = express.Router();
app.use(express.static(__dirname + '/'));

// Set up MARKLOGIC
var db = marklogic.createDatabaseClient(config.marklogic);
var q = marklogic.queryBuilder;

// Log requests
router.use(function(req, res, next) {
  console.log('%s %s', req.method, req.url);
  next();
});

// GET photo data
router.get('/data', function(req, res, next) {
  // params from URL
  var start = req.query.start ? req.query.start : 1,
      length = req.query.length ? req.query.length : 10,
      sort = req.query.sort ? req.query.sort : 'descending',
      min = req.query.min ? req.query.min : '1970-01-01T00:00:00-07:00',
      max = req.query.max ? req.query.max : '2020-12-31T23:59:59-07:00',
      tr = req.query.tr ? req.query.tr : '',
      id = req.query.id ? req.query.id : '';
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

// Only requests to /api/ will be sent to router.
app.use('/api', router);

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
