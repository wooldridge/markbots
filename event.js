var Event = function (obj) {
  this.event = obj || {};
};

Event.prototype.getProp = function (prop) {
  return this.event[prop];
};

Event.prototype.setProp = function (prop, val) {
  this.event[prop] = val;
  return this;
};

Event.prototype.toJSON = function () {
  var d = new Date();
  var ts =
    d.getFullYear() +'-'+
    ('0' + (d.getMonth()+1)).slice(-2) +'-'+
    ('0' + d.getDate()).slice(-2) + '_' +
    ('0' + d.getHours()).slice(-2) + '-' +
    ('0' + d.getMinutes()).slice(-2) + '-' +
    ('0' + d.getSeconds()).slice(-2);
  this.event['timestampe'] = ts;
  return this.event;
};

module.exports = Event;
