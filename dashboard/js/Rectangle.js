var APP = APP || {};

/**
 * Class representing a bot.
 * @constructor
 * @param data A data object.
 */
APP.Rectangle = function (map, coords) {
  'use strict';
      // properties
  var rectangle,
      map,
      center,
      infoWindow,
      bounds,
      lat1,
      lon1,
      lat2,
      lon2,

      // methods
      show,
      hide,
      isVisible,
      getCoords,
      setListener;

  // initialize properties
  map = map || {};

  center = map.getCenter();
  lat1 = coords.lat2 || center.lat() + config.map.rectangle.lat1;
  lon1 = coords.lon2 || center.lng() + config.map.rectangle.lon1;
  lat2 = coords.lat1 || center.lat() + config.map.rectangle.lat2;
  lon2 = coords.lon1 || center.lng() + config.map.rectangle.lon2;

  var bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(lat1, lon1),
      new google.maps.LatLng(lat2, lon2)
  );

  // Define the rectangle
  rectangle = new google.maps.Rectangle({
    bounds: bounds,
    editable: true,
    draggable: true,
    visible: false
  });

  // Use show() to make visible
  rectangle.setMap(map);

  // Define an info window on the map.
  infoWindow = new google.maps.InfoWindow();

 /**
  * Show the rectangle.
  */
  show = function () {
    rectangle.setVisible(true);
  };

 /**
  * Hide the rectangle.
  */
  hide = function () {
    rectangle.setVisible(false);
  };

 /**
  * Is rectangle visible?
  */
  isVisible = function () {
    rectangle.getVisible();
  };

 /**
  * Get the coordinates.
  */
  getCoords = function () {
    bounds = rectangle.getBounds();
    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();
    var result = {
      lat1: ne.lat(),
      lon1: ne.lng(),
      lat2: sw.lat(),
      lon2: sw.lng()
    }
    return result;
  };

  setListener = function (func) {
    rectangle.addListener('bounds_changed', func);
  }

  // Public API
  return {
    show: show,
    hide: hide,
    isVisible: isVisible,
    getCoords: getCoords,
    setListener: setListener
  };

};
