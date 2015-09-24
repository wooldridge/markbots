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

      // methods
      getId,
      getCoords,
      getIp,
      getLastMod,
      getPhotos,
      getLastCap,
      isOnline,
      addPhoto,
      setColor,
      getColor,
      getMotion;

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
  mot = data.properties.mot || null;
  photos = [];

 /**
  * Get ID.
  */
  getId = function () {
    return id;
  };

 /**
  * Get GPS coordinates.
  */
  getCoords = function () {
    return {lat: lat, lon: lon};
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
    getMotion: getMotion
  };

};
