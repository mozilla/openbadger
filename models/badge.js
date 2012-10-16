var db = require('./');
var mongoose = require('mongoose');
var env = require('../lib/environment');
var util = require('../lib/util');
var Issuer = require('./issuer');
var Schema = mongoose.Schema;

function maxLength(field, length) {
  function lengthValidator() {
    if (!this[field]) return true;
    return this[field].length <= length;
  }
  var msg = 'maxLength';
  return [lengthValidator, msg];
}

var BehaviorSchema = new Schema({
  shortname: {
    type: String,
    trim: true,
    required: true
  },
  count: {
    type: Number,
    min: 0,
    required: true
  }
});

var BadgeSchema = new Schema({
  shortname: {
    type: String,
    trim: true,
    required: true,
    unique: true
  },
  name: {
    type: String,
    trim: true,
    required: true,
    unique: true,
    validate: maxLength('name', 128)
  },
  description: {
    type: String,
    trim: true,
    required: true,
    validate: maxLength('description', 128)
  },
  criteria: {
    content: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    }
  },
  behaviors: {
    type: [BehaviorSchema],
    unique: true
  },
  prerequisites: {
    type: [String]
  },
  image: {
    type: Buffer,
    required: true,
    validate: maxLength('image', 256 * 1024)
  }
});
var Badge = db.model('Badge', BadgeSchema);

/**
 * Middleware for setting default shortname when one is not provided.
 */

function setShortNameDefault(next) {
  if (!this.shortname && this.name)
    this.shortname = util.slugify(this.name);
  next();
}
BadgeSchema.pre('validate', setShortNameDefault);

/**
 * Find a badge by the shortname of a behavior associated with the badge.
 *
 * @param {String} shortname
 */

Badge.findByBehavior = function findByBehavior(shortnames, callback) {
  shortnames = Array.isArray(shortnames) ? shortnames : [shortnames]
  var searchTerms = { behaviors: { '$elemMatch': { shortname: {'$in': shortnames }}}};
  return Badge.find(searchTerms, callback);
};

/**
 * Remove a behavior from the list of required behaviors for the badge
 *
 * @param {String} shortname
 */

Badge.prototype.removeBehavior = function removeBehavior(shortname) {
  var behaviors = this.behaviors.filter(function (behavior) {
    if (behavior.shortname === shortname)
      return null;
    return behavior;
  });
  this.behaviors = behaviors;
  return this;
};

/**
 * Get the image buffer as a data URI
 *
 * @return {String} the data URI representing the image.
 */

Badge.prototype.imageDataURI = function imageDataURI() {
  // #TODO: don't hardcode PNG maybe
  var base64 = '';
  var format = 'data:image/png;base64,%s';
  if (this.image)
    base64 = this.image.toString('base64');
  return util.format('data:image/png;base64,%s', base64);
};

/**
 * Get relative URL for a field
 *
 * @param {String} field Should be either `criteria` or `image`
 * @return {String} relative url
 */
Badge.prototype.relativeUrl = function relativeUrl(field) {
  var formats = {
    criteria: '/badge/criteria/%s',
    image: '/badge/image/%s.png'
  };
  return util.format(formats[field], this.shortname);
};


/**
 * Get absolute URL for a field
 *
 * @param {String} field Should be either `criteria` or `image`
 * @return {String} absolute url
 */
Badge.prototype.absoluteUrl = function absoluteUrl(field) {
  return env.qualifyUrl(this.relativeUrl(field));
};

/**
 * Convert to an assertion compatible object
 *
 * @return {Object} assertion compatible object.
 */

Badge.prototype.toAssertionObject = function () {
  var VERSION = '0.5.0';
  return {
    version: VERSION,
    name: this.name,
    description: this.description,
    image: this.absoluteUrl('image'),
    criteria: this.absoluteUrl('criteria')
  };
};

/**
 * Generate an assertion from the badge.
 *
 * @param {Object} details Recipient details:
 *   - `recipient`: User email
 *   - `evidence`: URL for badge evidence (optional)
 *   - `expires`: When the badge expires (optional)
 *   - `issuedOn`: When the badge was issued (optional)
 *   - `salt`: Salt for hashing the email (optional)
 * @param {Object} options
 *   - `json`: Return JSON (default: true)
 */

Badge.prototype.makeAssertion = function makeAssertion(details, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  options = options || { json: true }
  var salt = details.salt || util.randomString(64);

  var assertion = {};
  assertion.recipient = util.sha256(details.recipient, salt);
  assertion.salt = salt;
  if (details.evidence)
    assertion.evidence = details.evidence;
  if (details.expires)
    assertion.expires = details.expires;
  if (details.issuedOn)
    assertion.issued_on = details.issuedOn;

  var badge = assertion.badge = this.toAssertionObject();

  Issuer.getAssertionObject(function (err, issuerObj) {
    if (err) return callback(err);
    badge.issuer = issuerObj;
    if (options.json === true)
      return callback(null, JSON.stringify(assertion));
    return callback(null, assertion);
  });
};
module.exports = Badge;
