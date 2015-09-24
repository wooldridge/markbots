$(document).ready(function () {

  var min = '',
      max = '',
      botsToColors = {},
      userCoords = {},
      bots = [],
      botsMap = {},
      tableTemplate;

  function getBots() {
    // TODO make this configurable
    var str = $('form').serialize();
    bots = [];
    botsMap = {};
    $.ajax('http://'+config.dashboard.host+':'+config.dashboard.port+'/api/bots?' + str)
      .done(function(data) {
        if ( console && console.log ) {
          console.log( data );
        }
        //$('#result').html('');
        data.forEach(function(res) {
          var b = new APP.Bot(res);
          bots.push(b);
          botsMap[b.getId()] = bots.length-1;
          console.log("Bot ID: " + b.getId());
        });

        // TODO bot keys need to be in array for sorting
        // bots.sort(function (a, b) {
        //   var aName = a.getId().toLowerCase();
        //   var bName = b.getId().toLowerCase();
        //   return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
        // });

        getPhotos(bots);
      }
    );
  }

  function getPhotos(bots) {
    // TODO make this configurable
    var str = $('form').serialize();
    photos = [];
    $.ajax('http://'+config.dashboard.host+':'+config.dashboard.port+'/api/photos?' + str)
      .done(function(data) {
        if ( console && console.log ) {
          console.log( data );
        }
        $('#result').html('');
        data.forEach(function(res) {
          var p = new APP.Photo(res);
          var botIndex = botsMap[p.getBotId()];
          bots[botIndex].addPhoto(p);
          p.setBot(bots[botIndex]);
          photos.push(p);
          console.log("URI: " + p.getUri());
          // TODO make this configurable
          var img = '<a href="http://'+config.dashboard.host+':'+config.dashboard.port+'/api/photo?uri=' +
                    p.getUri() + '" data-lightbox="markbot" data-title="' + p.getLastMod() + '">';
          img += '<img src="http://'+config.dashboard.host+':'+config.dashboard.port+'/api/photo?uri=' +
                    p.getUri() + '" id="'+p.getUri()+'" style="width: 150px" />';
          img += '</a>';
          $('#result').append(img);
        });

        // if (photos.length > 0) {
        //   $('#start-date').val(photos[photos.length - 1].properties['$ml.prop']['last-modified']);
        //   $('#end-date').val(photos[0].properties['$ml.prop']['last-modified']);
        // }

        // Set up table
        //$('#summary').html('<tr><td>Bot</td><td>Lat</td><td>Lon</td><td>Last Activity</td><td>Status</td><td>Motion</td><td>Actions</td></tr>');
        var botsJson = [];
        bots.forEach(function(b) {
          var coords = b.getCoords();
          var row = '<tr><td>'+b.getId()+'</td><td>'+coords.lat+'</td><td>'+coords.lon+'</td><td>'+b.getLastCap()+'</td><td>'+(b.isOnline() ? 'Online' : 'Offline')+'</td><td>'+(b.getMotion() ? 'On' : 'Off')+'</td><td><input type="button" name="'+b.getId()+'" value="capture" /> <input type="button" name="'+b.getId()+'" value="motion" /></td></tr>';
          //$('#summary').append(row);
          botsJson.push(b.getAsJson());
        });

        json = {bots: botsJson};

        resultsPlaceholder.append(tableTemplate(json));

        $("input[value='capture']").click(function () {
          console.dir(this);
          socket.emit('captureRequest', {id: this.name});
        });

        $("input[value='motion']").click(function () {
          console.dir(this);
          socket.emit('motionRequest', {id: this.name});
        });
        setUpMap(bots, photos);
      }
    );
  }

  var options = {
        center: {},
        scrollwheel: false,
        zoom: 18
  };

  function setUpMap(bots, photos) {
    // Get user GPS coords
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
          // Store coords for possible future use
          userCoords.lat = position.coords.latitude;
          userCoords.lon = position.coords.longitude;
      });
    } else {
        console.log("Geolocation is not supported by this browser.");
    }

    var firstCoords = {lat: '', lon: ''},
        count = 0;
    // get GPS coords from first photo that has them, start from most recent
    while (photos[count]) {
      var coords = photos[count].getCoords()
      if (coords.lat !== null && coords.lon !== null) {
        firstCoords = photos[count].getCoords();
        options.center.lat = firstCoords.lat;
        options.center.lng = firstCoords.lon;
        break;
      }
      count++;
    }

    var map = new google.maps.Map(document.getElementById('map'), options);

    coordsForLine = [];
    photos.forEach(function(photo) {
      var coords = photo.getCoords();
      if (coords.lat && coords.lon) {
        var marker = new google.maps.Marker({
          map: map,
          position: {
            lat: coords.lat,
            lng: coords.lon
          },
          title: photo.getUri(),
          icon: 'images/'+photo.getBotId()+'.png'
        });
        coordsForLine.push({lat: coords.lat, lng: coords.lon});
        // Open lightbox image on marker click
        google.maps.event.addListener(marker, 'click', function() {
          actuateLink(document.getElementById(photo.getUri()));
        });
      }
    });

    var photoPath = new google.maps.Polyline({
      path: coordsForLine,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2
    });

    photoPath.setMap(map);
  }

  // Set up filters
  //$( "#start-date" ).datepicker({"setDate": "10/12/2012"});
  //$( "#end-date" ).datepicker({"setDate": "4/12/2014"});

  $( "input[type='text']" ).on( "focusout", getBots );
  $( "select" ).on( "change", getBots );

  // Connect to dashboard socket
  var socket = io.connect('http://' + config.dashboard.host +
                        ':' + config.dashboard.port);

Handlebars.registerHelper("everyOther", function (index, amount, scope) {
    if ( ++index % amount)
        return scope.inverse(this);
    else
        return scope.fn(this);
});

  var source = $("#summary-table-template").html();
  var tableTemplate = Handlebars.compile(source);
  var resultsPlaceholder = $("#summary-table");


  //resultsPlaceholder.append(tableTemplate(data));

  getBots();


  // http://blog.stchur.com/2010/01/15/programmatically-clicking-a-link-in-javascript/
  // To activat lightbox link on marker click. Not sure if all browsers support this.
  function actuateLink(link) {
     var allowDefaultAction = true;
     if (link.click) {
        link.click();
        return;
     }
     else if (document.createEvent) {
        var e = document.createEvent('MouseEvents');
        e.initEvent(
           'click'     // event type
           ,true      // can bubble?
           ,true      // cancelable?
        );
        allowDefaultAction = link.dispatchEvent(e);
     }

     if (allowDefaultAction) {
        var f = document.createElement('form');
        f.action = link.href;
        document.body.appendChild(f);
        f.submit();
     }
  }

});
