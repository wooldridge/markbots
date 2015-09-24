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
      color,

      // methods
      getId,
      getCoords,
      getIp,
      getLastMod,
      getPhotos,
      addPhoto,
      setColor,
      getColor;

  // initialize properties
  data = data || {};

  id = data.properties.id || '';
  lat = data.properties.lat || 0;
  lon = data.properties.lon || 0;
  ts = data.properties.ts || 0;
  ip = data.properties.ip.replace(/-/g, '.') || '';
  if (data.properties['$ml.prop']['last-modified']) {
    lastMod = new Date(data.properties['$ml.prop']['last-modified']);
  } else {
    lastMod = '';
  }
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
  * Add a photo taken by bot.
  * @param photo A Photo object.
  */
  addPhoto = function (photo) {
    // If photo added is most recent, use as basis for properties
    var photoLastMod = photo.getLastMod().getTime();
    if (lastMod === '' || lastMod.getTime() < photoLastMod) {
      var photoCoords = photo.getCoords();
      lat = photoCoords.lat || lat;
      lon = photoCoords.lon || lon;
      ts = photo.getTs() || ts;
      ip = photo.getIp() || ip;
      lastMod = photo.getLastMod() || lastMod;
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

  // Public API
  return {
    getId: getId,
    getCoords: getCoords,
    getIp: getIp,
    getLastMod: getLastMod,
    getPhotos: getPhotos,
    addPhoto: addPhoto,
    setColor: setColor,
    getColor: getColor
  };

};
