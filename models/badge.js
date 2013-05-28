const _ = require('underscore');
const db = require('./');
const mongoose = require('mongoose');
const env = require('../lib/environment');
const util = require('../lib/util');
const Issuer = require('./issuer');
const BadgeInstance = require('./badge-instance');
const phraseGenerator = require('../lib/phrases');
const async = require('async');
const Schema = mongoose.Schema;

const BehaviorSchema = new Schema({
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

const ClaimCodeSchema = new Schema({
  code: {
    type: String,
    required: true,
    trim: true,
  },
  claimedBy: {
    type: String,
    required: false,
    trim: true,
  },
  multi: {
    type: Boolean,
    default: false
  },
});

const BadgeSchema = new Schema({
  _id: {
    type: String,
    unique: true,
    required: true,
    default: db.generateId,
  },
  shortname: {
    type: String,
    trim: true,
    required: true,
    unique: true
  },
  program: {
    type: String,
    ref: 'Program',
  },
  doNotList: {
    type: Boolean,
    default: false,
  },
  tags: [String],
  name: {
    type: String,
    trim: true,
    required: true,
    unique: true,
    validate: util.maxLength('name', 128)
  },
  description: {
    type: String,
    trim: true,
    required: true,
    validate: util.maxLength('description', 128)
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
  categoryAward: {
    type: Boolean,
  },
  categoryRequirement: {
    type: Number,
    default: 0
  },
  categoryWeight: {
    type: Number,
    required: true,
    default: 0
  },
  image: {
    type: Buffer,
    required: true,
    validate: util.maxLength('image', 256 * 1024)
  },
  category: {
    type: String,
    trim: true,
  },
  timeToEarn: {
    type: String,
    trim: true,
  },
  ageRange: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    trim: true
  },
  activityType: {
    type: String,
    trim: true
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
});
const Badge = db.model('Badge', BadgeSchema);

// Validators & Defaulters
// -----------------------

function setShortNameDefault(next) {
  if (!this.shortname && this.name)
    this.shortname = util.slugify(this.name);
  next();
}
BadgeSchema.pre('validate', setShortNameDefault);

// Model methods
// -------------

Badge.findByBehavior = function findByBehavior(shortnames, callback) {
  shortnames = Array.isArray(shortnames) ? shortnames : [shortnames];
  const searchTerms = { behaviors: { '$elemMatch': { shortname: {'$in': shortnames }}}};
  return Badge.find(searchTerms, callback);
};

Badge.getAll = function getAll(callback) {
  const query = {};
  const exclude = { '__v': 0, image: 0 };
  Badge.find(query, exclude, function (err, badges) {
    if (err) return callback(err);
    const byName = badges.reduce(function (result, badge) {
      result[badge.shortname] = badge;
      return result;
    }, {});
    return callback(null, byName);
  });
};

Badge.findByClaimCode = function findByClaimCode(code, callback) {
  const query = { claimCodes: { '$elemMatch' : { code: code }}};
  Badge.findOne(query, callback);
};

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
 *   - `multi`: Whether or not the claim is multi-use
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

  const accepted = [];
  const rejected = [];
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
      this.claimCodes.push({ code: code, multi: options.multi });
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
  const codes = this.claimCodes;

  const filterFn = opts.unclaimed
    ? function (o) { return !o.claimedBy }
    : function (o) { return true };

  return codes.filter(filterFn).map(function (entry) {
    return { code: entry.code, claimed: !!entry.claimedBy };
  });
};

Badge.prototype.claimCodeIsClaimed = function claimCodeIsClaimed(code) {
  const claim = this.getClaimCode(code);
  if (!claim)
    return null;
  return !!(claim.claimedBy && !claim.multi);
};

Badge.prototype.redeemClaimCode = function redeemClaimCode(code, email) {
  const claim = this.getClaimCode(code);
  if (!claim)
    return null;
  if (!claim.multi && claim.claimedBy && claim.claimedBy !== email)
    return false;
  claim.claimedBy = email;
  return true;
};

Badge.prototype.removeClaimCode = function removeClaimCode(code) {
  this.claimCodes = this.claimCodes.filter(function (claim) {
    return claim.code !== code;
  });
};

Badge.prototype.releaseClaimCode = function releaseClaimCode(code) {
  const claim = this.getClaimCode(code);
  claim.claimedBy = null;
  return true;
};

Badge.prototype.earnableBy = function earnableBy(user) {
  return this.behaviors.map(function (behavior) {
    const name = behavior.shortname;
    const minimum = behavior.count;
    return user.credit[name] >= minimum;
  }).reduce(function (result, value) {
    return result && value;
  }, true);
};

Badge.prototype.award = function award(options, callback) {
  if (typeof options === 'string')
    options = {user: options};
  const DUP_KEY_ERROR_CODE = 11000;
  const checkForCategoryBadges =
    !this.categoryAward && this.categoryWeight;
  const email = options.user;
  const category = this.category;
  const weight = this.weight;
  const instance = new BadgeInstance({
    user: email,
    badge: this.id,
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
    if (options.sendEmail) {
      console.log('WRITE SEND EMAIL CODE');
      // #TODO: add email code here
    }
    if (!checkForCategoryBadges)
      return callback(null, instance, []);

    async.waterfall([
      function getCategoryBadges(callback) {
        const query = {category: category, categoryAward: true};
        Badge.find(query, callback);
      },
      function filterByScore(badges, callback) {
        BadgeInstance.findByCategory(email, category, function (err, instances) {
          if (err) return callback(err);
          const score = instances.reduce(function (sum, inst) {
            return (sum += inst.badge.categoryWeight, sum);
          }, 0);
          const eligible = badges.filter(function (badge) {
            return score >= badge.categoryRequirement;
          });
          return callback(null, eligible);
        });
      },
      function filterByOwned(badges, callback) {
        async.filter(badges, function (badge, cb) {
          const doesNotOwnBadge = util.negate(BadgeInstance.userHasBadge);
          doesNotOwnBadge(email, badge.shortname, function (err, result) {
            return cb(result);
          });
        }, function (results) { callback(null, results) });
      },
      function awardBadges(badges, callback) {
        const newOpts = { user: email, sendEmail: true };
        async.map(badges, util.method('award', newOpts), callback);
      },
    ], function (err, instances) {
      if (err) return callback(err);
      return callback(null, instances, instances);
    });
  });
};

Badge.prototype.awardOrFind = function awardOrFind(email, callback) {
  const query = { userBadgeKey: [email, this.id].join('.') };
  this.award(email, function (err, instance) {
    if (!instance) {
      BadgeInstance.findOne(query, function (err, instance) {
        if (err) return callback(err);
        return callback(null, instance);
      });
    }
  });
};

Badge.prototype.creditsUntilAward = function creditsUntilAward(user) {
  return this.behaviors.reduce(function (result, behavior) {
    const name = behavior.shortname;
    const userCredits = user.credit[name] || 0;
    if (userCredits < behavior.count)
      result[name] = behavior.count - userCredits;
    return result;
  }, {});
};

Badge.prototype.removeBehavior = function removeBehavior(shortname) {
  const behaviors = this.behaviors.filter(function (behavior) {
    if (behavior.shortname === shortname)
      return null;
    return behavior;
  });
  this.behaviors = behaviors;
  return this;
};

Badge.prototype.imageDataURI = function imageDataURI() {
  // #TODO: don't hardcode to PNG maybe?
  const format = 'data:image/png;base64,%s';
  const base64 = this.image ? this.image.toString('base64') : '';
  return util.format('data:image/png;base64,%s', base64);
};

Badge.prototype.relativeUrl = function relativeUrl(field) {
  const formats = {
    criteria: '/badge/criteria/%s',
    image: '/badge/image/%s.png',
    json: '/badge/meta/%s.json'
  };
  return util.format(formats[field], this.shortname);
};

Badge.prototype.absoluteUrl = function absoluteUrl(field) {
  return env.qualifyUrl(this.relativeUrl(field));
};

Badge.prototype.makeJson = function makeJson() {
  // expects a populated instance
  return {
    name: this.name,
    description: this.description,
    image: this.imageDataURI(),
    criteria: this.absoluteUrl('criteria'),
    issuer: this.program.absoluteUrl('json'),
    tags: this.tags
  };
};

Badge.parseRubricItems = function(content) {
  const OPTIONAL_REGEXP = /\(\s*optional\s*\)/;
  var lines = content.split('\n');
  var rubricItems = [];

  lines.forEach(function(line) {
    line = line.trim();
    if (line.length && line[0] == '*') {
      rubricItems.push({
        text: line.slice(1).trim(),
        required: !OPTIONAL_REGEXP.test(line)
      });
    }
  });
  if (rubricItems.length == 0)
    rubricItems.push({
      text: "Satisfies the following criteria:\n" + content,
      required: true
    });
  return rubricItems;
};

Badge.prototype.getRubricItems = function() {
  var source = this.criteria.content;
  return Badge.parseRubricItems(this.criteria.content);
};

Badge.prototype.getRecommendations = function (email, callback) {
  if (typeof email == 'function')
    callback = email, email = null;
  const query = {
    '$or': this.tags.map(util.objWrap('tags'))
  };
  return Badge.find(query, function (err, badges) {
    if (!email)
      return callback(err, badges);

    return BadgeInstance.find({user: email})
      .populate('badge')
      .exec(function (err, instances) {
        if (err)
          return callback(err);

        const earned = instances.map(function (inst) {
          return (inst.badge && inst.badge.shortname);
        }).filter(Boolean);

        return callback(null, badges.filter(function (badge) {
          return !(_.contains(earned, badge.shortname));
        }));
      });
  });

};
module.exports = Badge;
