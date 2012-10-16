var db = require('./');
var mongoose = require('mongoose');
var env = require('../lib/environment');
var Schema = mongoose.Schema;

function maxLength(field, length) {
  function lengthValidator() {
    if (!this[field]) return true;
    return this[field].length <= length;
  }
  var msg = 'maxLength';
  return [lengthValidator, msg];
}

var regex = {
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/
}

var IssuerSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true,
    validate: maxLength('name', 128)
  },
  org: {
    type: String,
    trim: true,
    required: false,
    validate: maxLength('org', 128)
  },
  contact: {
    type: String,
    trim: true,
    required: true,
    match: regex.email
  }
});
var Issuer = db.model('Issuer', IssuerSchema);

Issuer.getAssertionObject = function getAssertionObject(callback) {
  Issuer.findOne(function (err, issuer) {
    if (err)
      return callback(err);
    if (!issuer)
      return callback(new Error('no issuer in database'));
    var result = {};
    result.name = issuer.name;
    result.contact = issuer.contact;
    if (issuer.org)
      result.org = issuer.org;
    result.origin = env.origin();
    return callback(null, result);
  });
};

module.exports = Issuer;