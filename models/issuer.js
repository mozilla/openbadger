var db = require('./');
var mongoose = require('mongoose');
var env = require('../lib/environment');
var util = require('../lib/util');
var Schema = mongoose.Schema;

const DEFAULT_SECRET_LENGTH = 64;
const NAME_MAX_LENGTH = 128;
const ORG_MAX_LENGTH = 128;


function generateRandomSecret() {
  return util.strongRandomString(DEFAULT_SECRET_LENGTH);
}

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
    validate: maxLength('name', NAME_MAX_LENGTH)
  },
  org: {
    type: String,
    trim: true,
    required: false,
    validate: maxLength('org', ORG_MAX_LENGTH)
  },
  contact: {
    type: String,
    trim: true,
    required: true,
    match: regex.email
  },
  jwtSecret: {
    type: String,
    trim: true,
    required: true,
    default: generateRandomSecret
  },
});
var Issuer = db.model('Issuer', IssuerSchema);

/**
 * Set a new random secret if one is not already defined.
 * While we already have a `default` set in the schema, that only gets
 * set at instantiation. We want to be able to delete the secret that's
 * already there and get a new one generated for us.
 */

IssuerSchema.pre('validate', function defaultSecret(next) {
  if (this.jwtSecret) return next();
  this.jwtSecret = generateRandomSecret();
  return next();
});

/**
 * Get an object compatible with the `badge.issuer` portion of the
 * OpenBadges spec.
 */

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