var APP = APP || {};

/**
 * Class representing a photo.
 * @constructor
 * @param data A data object.
 */
APP.Photo = function (data) {
  'use strict';
      // properties
  var uri,
      cat,
      lat,
      lon,
      tr,
      botId,
      tr,
      ts,
      ip,
      lastMod,
      bot,

      // methods
      getUri,
      getCoords,
      getBotId,
      getTs,
      getIp,
      getLastMod,
      setBot,
      getBot;

  // initialize properties
  data = data || {};

  uri = data.uri || '';
  cat = data.properties.cat || 'photo';
  lat = data.properties.lat || 0;
  lon = data.properties.lon || 0;
  tr = data.properties.tr || '';
  botId = data.properties.id || '';
  ts = data.properties.ts || '';
  ip = data.properties.ip.replace(/-/g, '.') || '';
  lastMod = data.properties['$ml.prop']['last-modified'] || '';

 /**
  * Get URI.
  */
  getUri = function () {
    return uri;
  };

 /**
  * Get GPS coordinates.
  */
  getCoords = function () {
    return {lat: lat, lon: lon};
  };

 /**
  * Get the bot ID.
  */
  getBotId = function () {
    return botId;
  };

 /**
  * Get the timestamp.
  */
  getTs = function () {
    return ts;
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
    var date = new Date(lastMod);
    return date;
  };

 /**
  * Set the bot for the photo.
  */
  setBot = function (b) {
    bot = b;
  };

 /**
  * Get bot for the photo.
  */
  getBot = function () {
    return bot;
  };

  // Public API
  return {
    getUri: getUri,
    getCoords: getCoords,
    getBotId: getBotId,
    getTs: getTs,
    getIp: getIp,
    getLastMod: getLastMod,
    setBot: setBot,
    getBot: getBot
  };

};
