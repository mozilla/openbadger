const _ = require('underscore');
const db = require('./');
const mongoose = require('mongoose');
const env = require('../lib/environment');
const util = require('../lib/util');
const Issuer = require('./issuer');
const phraseGenerator = require('../lib/phrases');
const Schema = mongoose.Schema;

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

var ClaimCodeSchema = new Schema({
  code: {
    type: String,
    required: true,
    trim: true,
  },
  claimedBy: {
    type: String,
    required: false,
    trim: true,
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
  claimCodes: {
    type: [ClaimCodeSchema],
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

// Validators & Defaulters
// -----------------------

/**
 * Middleware for setting default shortname when one is not provided.
 */

function setShortNameDefault(next) {
  if (!this.shortname && this.name)
    this.shortname = util.slugify(this.name);
  next();
}
BadgeSchema.pre('validate', setShortNameDefault);

// Model methods
// -------------

/**
 * Find a badge by the shortname of a behavior associated with the badge.
 *
 * @param {String} shortname
 */

Badge.findByBehavior = function findByBehavior(shortnames, callback) {
  shortnames = Array.isArray(shortnames) ? shortnames : [shortnames];
  var searchTerms = { behaviors: { '$elemMatch': { shortname: {'$in': shortnames }}}};
  return Badge.find(searchTerms, callback);
};

/**
 * Get all badges and key by shortname
 */

Badge.getAll = function getAll(callback) {
  var query = {};
  var exclude = { '__v': 0, image: 0 };
  Badge.find(query, exclude, function (err, badges) {
    if (err) return callback(err);
    var byName = badges.reduce(function (result, badge) {
      result[badge.shortname] = badge;
      return result;
    }, {});
    return callback(null, byName);
  });
};

/**
 * Find a badge by one of its claim codes
 *
 * @asynchronous
 * @param {String} code
 * @param {Function} callback
 * @return {async: Badge|Null}
 */

Badge.findByClaimCode = function findByClaimCode(code, callback) {
  const query = { claimCodes: { '$elemMatch' : { code: code }}};
  Badge.findOne(query, callback);
};

/**
 * Get an array of all the claim codes across all badges
 *
 * @asynchronous
 * @return {async: Array}
 */

Badge.getAllClaimCodes = function getAllClaimCodes(callback) {
  Badge.find(function (err, badges) {
    if (err)
      return callback(err);
    const codes = badges.reduce(function (codes, badge) {
      badge.claimCodes.forEach(function (claim) {
        codes.push(claim.code);
      });
      return codes;
    }, []);
    return callback(null, codes);
  });
};

// Instance methods
// ----------------

/**
 * Tests whether the badge has an claim code
 *
 * @param {String} code
 * @return {Boolean}
 * @see Badge#getClaimCode
 */

Badge.prototype.hasClaimCode = function hasClaimCode(code) {
  return !!this.getClaimCode(code);
};

function inArray(array, thing) {
  return array.indexOf(thing) > -1;
}

function dedupe(array) {
  const matches = {};
  const results = [];
  var idx = array.length;
  var word;
  while (idx--) {
    word = array[idx];
    if (!matches[word])
      matches[word] = results.unshift(word);
  }
  return results;
}

/**
 * Add a bunch of claim codes and saves the badge. Will make sure the
 * codes are universally unique before adding them.
 *
 * @asynchronous
 * @param {Object} options
 *   - `codes`: Array of claim codes to add
 *   - `limit`: Maximum number of codes to add. [default: Infinity]
 *   - `alreadyClean`: Boolean whether or not items are already unique
 * @param {Function} callback
 *   Expects `function (err, accepted, rejected)`
 * @return {[async]}
 *   - `accepted`: Array of accepted codes
 *   - `rejected`: Array of rejected codes
 */
Badge.prototype.addClaimCodes = function addClaimCodes(options, callback) {
  if (Array.isArray(options))
    options = { codes: options };

  // remove duplicates
  const codes = (options.alreadyClean
    ? options.codes
    : dedupe(options.codes));
  const limit = options.limit || Infinity;

  var accepted = [];
  var rejected = [];
  var idx, newClaimCodes;
  Badge.getAllClaimCodes(function (err, existingCodes) {
    if (err) return callback(err);

    codes.forEach(function (code) {
      if (inArray(existingCodes, code) || accepted.length >= limit)
        return rejected.push(code);
      return accepted.push(code);
    }.bind(this));

    if (!accepted.length)
      return callback(err, accepted, rejected);

    accepted.forEach(function(code){
      this.claimCodes.push({ code: code });
    }.bind(this));

    return this.save(function (err, result) {
      if (err) return callback(err);
      return callback(null, accepted, rejected);
    });
  }.bind(this));
};

function extracount(opts) {
  const padded = Math.pow(opts.count, 1.06) | 0;
  if (padded < opts.minimum)
    return opts.minimum;
  return padded;
};

/**
 * Adds a set of random claim codes to the badge.
 *
 * @param {Object} options
 *   - `count`: how many codes to try to generate
 * @param {Function} callback
 *   Expects `function (err, codes)`
 * @return {[async]}
 *   - `codes`: the codes that got generated
 * @see Badge#addClaimCodes
 */

Badge.prototype.generateClaimCodes = function generateClaimCodes(options, callback) {
  // We want to generate more than we need upfront so if there are
  // duplicates when we compare against all of the badges in the
  // database we'll have backups.
  const count = options.count;
  const countWithExtra = extracount({
    count: count,
    minimum: 100
  });
  const phrases = phraseGenerator(countWithExtra);

  this.addClaimCodes({
    codes: phrases,
    limit: count,
    alreadyClean: true,
  }, function (err, accepted, rejected) {
    if (err) return callback(err);
    return callback(null, accepted);
  });
};


Badge.prototype.getClaimCode = function getClaimCode(code) {
  const codes = this.claimCodes;
  const normalizedCode = code.trim().replace(/ /g, '-').toLowerCase();
  var idx = codes.length;
  while (idx--) {
    if (codes[idx].code === normalizedCode)
      return codes[idx];
  }
  return null;
};

Badge.prototype.getClaimCodes = function getClaimCodes(opts) {
  opts = _.defaults(opts||{}, {unclaimed: false});
  const onlyShowUnclaimed = opts.unclaimed || false;
  const codes = this.claimCodes;
  
  var filterFn = function () { return true };
  
  if (onlyShowUnclaimed)
    filterFn = function (entry) { return !entry.claimedBy };
  
  return codes.filter(filterFn).map(function (entry) {
    return { code: entry.code, claimed: !!entry.claimedBy };
  });
};

/**
 * Whether or not an claim code is claimed
 *
 * @param {String} code
 * @return {Boolean|Null}
 *   true if claimed, false if not, null if not found
 * @see Badge#getClaimCode
 */

Badge.prototype.claimCodeIsClaimed = function claimCodeIsClaimed(code) {
  const claim = this.getClaimCode(code);
  if (!claim)
    return null;
  return !!(claim.claimedBy);
};

/**
 * Claim an claim code for a user if it hasn't already been claimed
 *
 * @param {String} code
 * @param {String} email
 * @return {Boolean|Null}
 *   true on success, false if already claimed, null if code not found
 * @see Badge#getClaimCode
 */

Badge.prototype.redeemClaimCode = function redeemClaimCode(code, email) {
  const claim = this.getClaimCode(code);
  if (!claim)
    return null;
  if (claim.claimedBy && claim.claimedBy !== email)
    return false;
  claim.claimedBy = email;
  return true;
};

/**
 * Remove a claim code from the list.
 *
 * @param {String} code
 */

Badge.prototype.removeClaimCode = function removeClaimCode(code) {
  this.claimCodes = this.claimCodes.filter(function (claim) {
    return claim.code !== code;
  });
};

/**
 * Release a claim code back into the wild (remove `claimedBy`)
 *
 * @param {String} code
 */

Badge.prototype.releaseClaimCode = function releaseClaimCode(code) {
  const claim = this.getClaimCode(code);
  claim.claimedBy = null;
  return true;
};


/**
 * Check if the credits are enough to earn the badge
 *
 * @param {User} user An object resembling a User object.
 * @return {Boolean} whether or not the badge is earned by the credits
 */

Badge.prototype.earnableBy = function earnableBy(user) {
  return this.behaviors.map(function (behavior) {
    var name = behavior.shortname;
    var minimum = behavior.count;
    return user.credit[name] >= minimum;
  }).reduce(function (result, value) {
    return result && value;
  }, true);
};

/**
 * Award a badge to a user
 *
 * @param {String} email
 */

Badge.prototype.award = function award(email, callback) {
  // need to load this late to avoid circular dependency race conditions.
  var DUP_KEY_ERROR_CODE = 11000;
  var BadgeInstance = require('./badge-instance');
  var instance = new BadgeInstance({
    user: email,
    badge: this.shortname
  });

  // We don't want to fail with an error if the user already has the
  // badge, so if we get back a duplicate key error we just return
  // nothing to indicate that the user already has the badge.
  instance.save(function (err, result) {
    if (err) {
      if (err.code === DUP_KEY_ERROR_CODE)
        return callback();
      return callback(err);
    }
    return callback(null, instance);
  });
};

/**
 * Award a badge or find the awarded badge
 */

Badge.prototype.awardOrFind = function awardOrFind(email, callback) {
  var BadgeInstance = require('./badge-instance');
  var query = { userBadgeKey: [email, this.shortname].join('.') };
  this.award(email, function (err, instance) {
    if (!instance) {
      BadgeInstance.findOne(query, function (err, instance) {
        if (err) return callback(err);
        return callback(null, instance);
      });
    }
  });
};

/**
 * Get how many credits a user has to earn before the badge is earnable.
 *
 * @param {User} user A user-like object, containing `credits` property
 * @return {Object}
 */

Badge.prototype.creditsUntilAward = function creditsUntilAward(user) {
  return this.behaviors.reduce(function (result, behavior) {
    var name = behavior.shortname;
    var userCredits = user.credit[name] || 0;
    if (userCredits < behavior.count)
      result[name] = behavior.count - userCredits;
    return result;
  }, {});
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
  options = options || { json: true };
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
