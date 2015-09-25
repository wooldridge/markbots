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
      getBot,
      getAsJson;

  // initialize properties
  data = data || {};

  uri = data.uri || '';
  cat = data.properties.cat || 'photo';
  lat = data.properties.lat || null;
  lon = data.properties.lon || null;
  tr = data.properties.tr || '';
  botId = data.properties.id || '';
  ts = data.properties.ts || '';
  ip = data.properties.ip ? data.properties.ip.replace(/-/g, '.') : '';
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

 /**
  * Get as a JSON representation (for templating).
  */
  getAsJson = function () {
    var json = {
      uri: uri,
      lat: lat,
      lon: lon,
      ip: ip,
      lastMod: lastMod,
      ts: ts,
      botId: botId,
      tr: tr
    }
    return json;
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
    getBot: getBot,
    getAsJson: getAsJson
  };

};
