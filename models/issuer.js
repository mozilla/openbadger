var db = require('./');
var mongoose = require('mongoose');
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
  origin: /^(https?):\/\/[^\s\/$.?#].[^\s\/]*\/?$/,
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
  origin: {
    type: String,
    trim: true,
    required: true,
    match: regex.origin
  },
  contact: {
    type: String,
    trim: true,
    required: true,
    match: regex.email
  }
});
var Issuer = db.model('Issuer', IssuerSchema);
module.exports = Issuer;