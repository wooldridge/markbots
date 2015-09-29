$(document).ready(function () {

  var map,
      min = '',
      max = '',
      botsToColors = {},
      userCoords = {},
      bots = [],
      botsMap = {}
      colors = {
        marbot1: '#be1e2d',
        markbot2: '#1b68b3',
        markbot3: '#1d9072'
      },
      getBotsFlag = false,
      getPhotosFlag = false;

  function getBots() {
    // don't have more than one getBots() going at once
    if (getBotsFlag) {
      return;
    }
    getBotsFlag = true;
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
        getBotsFlag = false;
      }
    );
  }

  function getPhotos(bots) {
    // don't have more than one getBots() going at once
    if (getPhotosFlag) {
      return;
    }
    getPhotosFlag = true;
    // TODO make this configurable
    var str = $('form').serialize();
    photos = [];
    var photosJson = [];
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
          json = p.getAsJson();
          json.host = config.dashboard.host;
          json.port = config.dashboard.port;
          photosJson.push(json);
        });

        json = {photos: photosJson};

        var source = $("#photos-template").html();
        var template = Handlebars.compile(source);
        $("#photos").html('').append(template(json));

        // Set up table
        var botsJson = [];
        bots.forEach(function(b) {
          // set nearby status
          //b.setNearby(bots);
          var coords = b.getCoords();
          if (coords.lat && coords.lon) {
            $.ajax('http://' + config.dashboard.host + ':' + config.dashboard.port +
            '/api/nearby?id=' + b.getId() + '&lat=' + coords.lat + '&lon=' + coords.lon)
              .done(function(data) {
                console.log('nearby results');
                console.dir(data);
                if (data.length > 0) {
                  // for now, assume will be one (since we have two bots)
                  var dist = data[0].dist * 1000; // meters
                  $('tr#row_' + b.getId() + ' td#col_nearby').html(dist.toFixed(2) + ' m');
                }
            });
          }
          // Only push if bot has images
          //if (b.getPhotos().length > 0) {
            botsJson.push(b.getAsJson());
          //}
        });

        json = {bots: botsJson};

        var source = $("#summary-table-template").html();
        var template = Handlebars.compile(source);
        $("#summary-table tbody").html('').append(template(json));

        $("input[value='capture']").click(function () {
          console.dir(this);
          socket.emit('captureRequest', {id: this.name});
        });

        $("input[value='motion']").click(function () {
          console.dir(this);
          socket.emit('motionRequest', {id: this.name});
        });

        // Click motion in table
        $('.summary-action-move a').on('click', function(event) {
          console.dir(event);
          event.preventDefault();
          socket.emit('motionRequest', {id: $(this).attr('rel')});
        });

        // Handle all types of capture toggling
        $('.capture-toggle').on('click', function(event) {
          console.dir(event);
          event.preventDefault();
          var parent = $(this).parents('.summary-row');
          var toggleType = parent.find('.summary-action-setting select').val();
          var toggleSetting = !parent.find('.capture-toggle').hasClass('on');
          socket.emit(toggleType + 'Request', { id: parent.attr('rel'), toggle: toggleSetting });
          if (toggleSetting && toggleType !== 'capture')
            parent.find('.capture-toggle').addClass('on');
          else
            parent.find('.capture-toggle').removeClass('on');
        });

        $('.summary-action-setting select').on('change', function(event) {
          console.dir(event);
          event.preventDefault();
          var parent = $(this).parents('.summary-row');
          parent.find('.capture-toggle').removeClass('on');
          socket.emit($('.summary-action-setting select[rel="'+data.id+'"]').val() + 'Request', {id: $(this).attr('rel'), toggle: 'off' });
        });

        $('.img-link').on('click', function(event) {
          if (event.shiftKey) {
            var c = confirm("Delete this photo?");
            console.log(c); //you can just return c because it will be true or false
            if (c) {
              deletePhoto($(this).attr('id'));
              event.stopPropagation();
              event.preventDefault();
            }
          }
        });

        setUpMap(bots, photos);
        getPhotosFlag = false;
      }
    );
  }

  function setUpMap(bots, photos) {

    var mapOptions = config.map.options;

    // Get user GPS coords
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        // First, set center to user center
        mapOptions.center.lat = position.coords.latitude;
        mapOptions.center.lng = position.coords.longitude;

        var count = 0;
        // Second, get GPS coords from first photo that has them, start from most recent
        while (photos[count]) {
          var coords = photos[count].getCoords()
          if (coords.lat !== null && coords.lon !== null) {
            mapOptions.center.lat = coords.lat;
            mapOptions.center.lng = coords.lon;
            break;
          }
          count++;
        }

        // if map is drawn, maintain zoom and center
        if (map) {
          mapOptions.zoom = map.getZoom();
          var centerCoords = map.getCenter();
          mapOptions.center.lat = centerCoords.lat();
          mapOptions.center.lng = centerCoords.lng();
        }

        map = new google.maps.Map(document.getElementById('map'), mapOptions);

        map.setOptions({styles: config.map.styles[config.map.activeStyle]});

        // RECTANGLE CONTROL
        // get existing coords (if present)
        var coords = {
          lat1: $('form #lat1').val(),
          lon1: $('form #lon1').val(),
          lat2: $('form #lat2').val(),
          lon2: $('form #lon2').val()
        };
        // set up rectangle
        var rectangle = new APP.Rectangle(map, coords);
        // show or hide depending on control
        if ($('#rect').val() === 'true') {
          rectangle.show();
        } else {
          rectangle.hide();
          $('form #lat1').disabled = true;
          $('form #lon1').disabled = true;
          $('form #lat2').disabled = true;
          $('form #lon2').disabled = true;
        }
        // handle resize events
        rectangle.setListener(function (event) {
          var coords = rectangle.getCoords();
          console.dir(coords);
          $('form #lat1').val(coords.lat1);
          $('form #lon1').val(coords.lon1);
          $('form #lat2').val(coords.lat2);
          $('form #lon2').val(coords.lon2);
        });
        // handle control events
        $('#rect').on( "change", function () {
          if ($('#rect').val() === 'true') {
            $('form #lat1').disabled = false;
            $('form #lon1').disabled = false;
            $('form #lat2').disabled = false;
            $('form #lon2').disabled = false;
          } else {
            $('form #lat1').disabled = true;
            $('form #lon1').disabled = true;
            $('form #lat2').disabled = true;
            $('form #lon2').disabled = true;
            $('form #lat1').val('');
            $('form #lon1').val('');
            $('form #lat2').val('');
            $('form #lon2').val('');
            getBots();
          }
        });

        // handle update button events
        $('#update').on( "click", function () {
            var coords = rectangle.getCoords();
            $('form #lat1').val(coords.lat1);
            $('form #lon1').val(coords.lon1);
            $('form #lat2').val(coords.lat2);
            $('form #lon2').val(coords.lon2);
            getBots();
          }
        );

        coordsForLine = {};
        photos.forEach(function(photo) {
          var coords = photo.getCoords();
          if (coords.lat && coords.lon) {
            var icon = {
              url: 'images/'+photo.getBotId()+'.png',
              size: new google.maps.Size(32, 32),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(16, 16)
            };
            var marker = new google.maps.Marker({
              map: map,
              position: {
                lat: coords.lat,
                lng: coords.lon
              },
              title: photo.getUri(),
              icon: icon,
              anchorPoint: new google.maps.Point(8, 8)
            });
            if (coordsForLine[photo.getBotId()]) {
              coordsForLine[photo.getBotId()].push({lat: coords.lat, lng: coords.lon});
            } else {
              coordsForLine[photo.getBotId()] = [];
              coordsForLine[photo.getBotId()].push({lat: coords.lat, lng: coords.lon});
            }
            //coordsForLine.push({lat: coords.lat, lng: coords.lon});
            // Open lightbox image on marker click
            google.maps.event.addListener(marker, 'click', function() {
              actuateLink(document.getElementById(photo.getUri()));
            });
          }
        });

        bots.forEach(function(b) {
          if (coordsForLine[b.getId()]) {
            var photoPath = new google.maps.Polyline({
              path: coordsForLine[b.getId()],
              geodesic: true,
              strokeColor: '#666666',
              strokeOpacity: 0.4,
              strokeWeight: 2
            });
            photoPath.setMap(map);
          }
        });
      });
      } else {
          console.log("Geolocation is not supported by this browser.");
      }

  }

  function deletePhoto(uri) {
    $.ajax('http://'+config.dashboard.host+':'+config.dashboard.port+'/api/delete?id=' + uri)
      .done(function(data) {
        // uri will have a dot, so use bracketed form
        // http://stackoverflow.com/questions/9930577/jquery-dot-in-id-selector
        $('a[id="' + uri + '"]').remove();
    });
  }

  // Set up filters
  //$( "#start-date" ).datepicker({"setDate": "10/12/2012"});
  //$( "#end-date" ).datepicker({"setDate": "4/12/2014"});

  //$( "input[type='text']" ).on( "focusout", getBots );
  $( "select" ).on( "change", getBots );

  $('.input-daterange input').each(function() {
    $(this).datepicker({format: 'yyyy-mm-dd'}).on('changeDate', function(e) {
        console.dir(e);
        getBots();
    });
  });

  // Connect to dashboard socket
  var socket = io.connect('http://' + config.dashboard.host +
                        ':' + config.dashboard.port);

  $.each(['motion','capture','multi'],function(val) {
    socket.on(val + 'Update', function (data) {
      console.log(val + 'Update');
      console.dir(data);
      $('.summary-action-setting select[rel="'+data.id+'"]').val(val);
      $('.summary-action-capture a[rel="'+data.id+'"]').removeClass('on');
      $('.summary-action-capture a[rel="'+data.id+'"]').addClass(data.toggle ? 'on' : 'off');
    });
  });

  socket.on('motionUpdate', function (data) {
    console.log('motionUpdate');
    console.dir(data);

    $('.summary-action-setting select[rel="'+data.id+'"]').val('motion');
    $('.summary-action-capture a[rel="'+data.id+'"]').removeClass('on');
    $('.summary-action-capture a[rel="'+data.id+'"]').addClass(data.toggle)
  });

  socket.on('captureUpdate', function (data) {
    console.log('captureUpdate: ' + data.uri);
    console.dir(data);
    // TODO
    var json = {
      host: config.dashboard.host,
      port: config.dashboard.port,
      uri: data.uri
    };

    var source = $("#photo-template").html();
    var template = Handlebars.compile(source);
    $("#photos").prepend(template(json));
  });

//  https://gist.github.com/elidupuis/1468937
//  format an ISO date using Moment.js
//  http://momentjs.com/
//  moment syntax example: moment(Date("2011-07-18T15:50:52")).format("MMMM YYYY")
//  usage: {{dateFormat creation_date format="MMMM YYYY"}}
Handlebars.registerHelper('dateFormat', function(context, block) {
  if (window.moment) {
    var f = block.hash.format || "MMM Do, YYYY";
    var d = new Date(context);
    return moment(d).format(f);
  }else{
    return context;   //  moment plugin not available. return data as is.
  };
});

Handlebars.registerHelper("everyOther", function (index, amount, scope) {
  if ( ++index % amount)
    return scope.inverse(this);
  else
    return scope.fn(this);
});

Handlebars.registerHelper("toPrecision", function (num, prec) {
  if (num && prec)
    return num.toPrecision(prec);
  else
    return num;
});

Handlebars.registerHelper("nearbyBots", function (bots) {
  var result = 'None'
  if (bots.length > 0) {
    var ids = [];
    bots.forEach(function(id) {
      ids.push(id);
    });
    result = ids.join(',');
  }
  return result;
});

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


  // Check if a bot has nearby bots
  function hasNearby() {
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
