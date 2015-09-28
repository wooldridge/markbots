var APP = APP || {};

/**
 * Class representing a bot.
 * @constructor
 * @param data A data object.
 */
APP.Bot = function (data) {
  'use strict';
      // properties
  var id,
      lat,
      lon,
      ts,
      ip,
      lastMod,
      photos,
      lastCap,
      color,
      mot,
      nearby,
      nearbyThreshold,

      // methods
      getId,
      getLat,
      getLon,
      getCoords,
      getIp,
      getLastMod,
      getPhotos,
      getLastCap,
      isOnline,
      addPhoto,
      setColor,
      getColor,
      getMotion,
      setNearby,
      getNearby,
      getAsJson,
      getDistBetwPoints,
      deg2rad;

  // initialize properties
  data = data || {};

  id = data.properties.id || '';
  lat = data.properties.lat || null;
  lon = data.properties.lon || null;
  ts = data.properties.ts || 0;
  ip = data.properties.ip ? data.properties.ip.replace(/-/g, '.') : '';
  if (data.properties['$ml.prop']['last-modified']) {
    lastMod = new Date(data.properties['$ml.prop']['last-modified']);
  } else {
    lastMod = '';
  }
  lastCap = ''; // is set based on added photos
  if (typeof data.properties.mot === 'boolean') {
    mot = data.properties.mot;
  } else {
    mot = null;
  }
  photos = [],
  nearby = []
  nearbyThreshold = 2; // in meters

 /**
  * Get ID.
  */
  getId = function () {
    return id;
  };

 /**
  * Get latitude.
  */
  getLat = function () {
    return lat;
  };

 /**
  * Get longitude.
  */
  getLon = function () {
    return lon;
  };

 /**
  * Get GPS coordinates.
  */
  getCoords = function () {
    return {lat: getLat(), lon: getLon()};
  };

 /**
  * Get the IP address.
  */
  getIp = function () {
    return ip;
  };

 /**
  * Get last-modified timestamp.
  */
  getLastMod = function () {
    return lastMod;
  };

 /**
  * Get the photos taken by bot.
  */
  getPhotos = function () {
    return photos;
  };

 /**
  * Get last-captured timestamp.
  */
  getLastCap = function () {
    return lastCap;
  };

 /**
  * Get last-captured timestamp.
  */
  isOnline = function () {
    var now = new Date();
    var currTime  = now.getTime() - (now.getTimezoneOffset() * 60000);
    var lastMod2 = lastMod.getTime() - (lastMod.getTimezoneOffset() * 60000);
    var threshold = 120000;
    return currTime < (lastMod2 + threshold);
  };

 /**
  * Add a photo taken by bot.
  * @param photo A Photo object.
  */
  addPhoto = function (photo) {
    var photoLastMod = photo.getLastMod().getTime();
    // If photo added is most recent photo, set last-captured property
    if (lastCap === '' || lastCap.getTime() < photoLastMod) {
      lastCap = photo.getLastMod() || lastCap;
    }
    // if bot doesn't have lat/lon and photo does, use the photo's lat/lon
    var coords = photo.getCoords();
    if ((lat === null || lon === null) && (coords.lat !== null || coords.lon !== null)) {
      lat = coords.lat;
      lon = coords.lon;
    }
    photos.push(photo);
  };

 /**
  * Set a color for the bot (e.g., for map markers).
  */
  setColor = function (c) {
    color = c;
  };

 /**
  * Get the bot color.
  */
  getColor = function () {
    return color;
  };

 /**
  * Get the motion status.
  */
  getMotion = function () {
    return mot;
  };

 /**
  * Set nearby status based on array of bots.
  */
  setNearby = function (bots) {
    nearby = [];
    // don't check if this bot has not lat/lon
    if (lat && lon) {
      bots.forEach(function(b) {
        var coords = b.getCoords();
        // bot to check must have lat/lon, not be same
        if (coords.lat && coords.lon && (b.getId() !== id)) {
          var dist = getDistBetwPoints(lat, lon, coords.lat, coords.lon);
          if ((dist * 1000) < nearbyThreshold) {
            nearby.push(b.getId());
          }
        }
      });
    }
  };

 /**
  * Get nearby status .
  */
  getNearby = function () {
    return nearby;
  };

 /**
  * Get as a JSON representation (for templating).
  */
  getAsJson = function () {
    var json = {
      id: id,
      lat: getLat(),
      lon: getLon(),
      ip: ip,
      lastMod: lastMod,
      lastCap: lastCap,
      status: isOnline(),
      mot: mot,
      numPhotos: getPhotos().length,
      nearby: getNearby()
    }
    return json;
  };

  getDistBetwPoints = function (lat1,lon1,lat2,lon2) {
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

  deg2rad = function (deg) {
    return deg * (Math.PI/180);
  };

  // Public API
  return {
    getId: getId,
    getCoords: getCoords,
    getIp: getIp,
    getLastMod: getLastMod,
    getPhotos: getPhotos,
    getLastCap: getLastCap,
    isOnline: isOnline,
    addPhoto: addPhoto,
    setColor: setColor,
    getColor: getColor,
    getMotion: getMotion,
    setNearby: setNearby,
    getNearby: getNearby,
    getAsJson: getAsJson
  };

};
