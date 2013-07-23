const _ = require('underscore');
const db = require('./');
const mongoose = require('mongoose');
const env = require('../lib/environment');
const util = require('../lib/util');
const Issuer = require('./issuer');
const Deletable = require('./deletable');
const BadgeInstance = require('./badge-instance');
const phraseGenerator = require('../lib/phrases');
const async = require('async');
const Schema = mongoose.Schema;
const webhooks = require('../lib/webhooks');
const s3 = require('../lib/s3');

const KID = '0-13';
const TEEN = '13-18';
const ADULT = '19-24';

const ALL_AGES = [KID, TEEN, ADULT];

const TemporaryEvidenceSchema = new Schema({
  path: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  }
});

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
  issuedBy: {
    type: String,
    required: false,
    trim: true,
  },
  reservedFor: {
    type: String,
    required: false,
    trim: true,
  },
  creationDate: {type: Date, default: Date.now},
  evidence: [TemporaryEvidenceSchema],
  batchName: {
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
    required: true
  },
  deleted: {type: Boolean, default: false},
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
    type: String,
    trim: true
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
  categories: [{type: String, trim: true}],
  timeToEarn: {
    type: String,
    trim: true,
    'enum': ['hours', 'days', 'weeks', 'months', 'years'],
  },
  ageRange: [{
    type: String,
    trim: true,
    'enum': [KID, TEEN, ADULT],
  }],
  type: {
    type: String,
    trim: true,
    'enum': ['skill', 'achievement', 'participation'],
  },
  activityType: {
    type: String,
    trim: true,
    'enum': ['offline', 'online'],
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
const Badge = Deletable(db.model('Badge', BadgeSchema));

Badge.KID = KID;
Badge.TEEN = TEEN;
Badge.ADULT = ADULT;

// Validators & Defaulters
// -----------------------

function setShortNameDefault(next) {
  if (!this.shortname && this.name)
    this.shortname = util.slugify(this.name);
  next();
}
BadgeSchema.pre('validate', setShortNameDefault);
BadgeSchema.pre('validate', function normalizeCategoryInfo(next) {
  if (this.categoryAward) {
    this.categories = [];
    this.categoryWeight = 0;
  } else {
    this.categoryRequirement = 0;
  }
  next();
});

// Model methods
// -------------

TemporaryEvidenceSchema.methods.getReadStream = function(cb) {
  s3.get(this.path).on('response', function(stream) {
    cb(null, stream);
  }).end();
};

// `files` is expected to be an array of file objects
// that conform to the structure described at
// http://expressjs.com/api.html#req.files.
ClaimCodeSchema.methods.addEvidence = function(files, cb) {
  var self = this;

  async.mapSeries(files, function addFile(file, cb) {
    var method = file.path ? 'putFile' : 'putBuffer';
    var remotePath = '/' + self.code + '/' + self.evidence.length;

    s3[method](file.path || file.buffer, remotePath, {
      'Content-Type': file.type
    }, function(err) {
      if (err) return cb(err);
      self.evidence.push({
        path: remotePath,
        mimeType: file.type
      });
      cb();
    });
  }, cb);
};

ClaimCodeSchema.methods.destroyEvidence = function(cb) {
  var self = this;

  async.mapSeries(self.evidence, function deleteFile(evidence, done) {
    s3.deleteFile(evidence.path, function(err) {
      if (err) return done(err);
      self.evidence.pull(evidence._id);
      done();
    });
  }, cb);
};

// Ideally our claim and evidence methods could be added as methods to
// their subdocument objects, just like normal model methods are, but
// this doesn't seem to be possible with Mongoose, so we'll add accessors
// to them here. Not particularly clean, but not sure what else to do. -AV
Badge.temporaryEvidence = {
  add: function(claim, files, cb) {
    return ClaimCodeSchema.methods.addEvidence.call(claim, files, cb);
  },
  destroy: function(claim, cb) {
    return ClaimCodeSchema.methods.destroyEvidence.call(claim, cb);
  },
  getReadStream: function(evidence, cb) {
    return TemporaryEvidenceSchema.methods.getReadStream.call(evidence, cb);
  }
};

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

Badge.awardCategoryBadges = function awardCategoryBadges(options, callback) {
  const email = options.email;
  var categories = options.categories;

  function setupCategories(setupCallback) {
    if (!categories) {
      Badge.distinct('categories', null, function(err, values) {
        categories = values;
        setupCallback(err);
      });
    }
    else {
      setupCallback();
    }
  }

  setupCategories(function(err) {
    if (err) {
      return callback(err);
    }

    async.concatSeries(categories, function(category, catCb) {
      async.waterfall([
        function getCategoryBadges(callback) {
          const query = {categoryAward: category};
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
          const newOpts = { user: email };
          async.map(badges, util.method('award', newOpts), callback);
        },
      ], catCb);
    }, function(err, instances) {
      if (err) return callback(err);
      return callback(null, instances);
    });
  });
}

// Instance methods
// ----------------

Badge.prototype.hasClaimCode = function hasClaimCode(code) {
  return !!this.getClaimCode(code);
};

function inArray(array, thing) {
  return array.indexOf(thing) > -1;
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
 *   - `issuedBy`: The user that issued the claim code
 *   - `reservedFor`: Who the claim code is reserved for
 *   - `batchName`: Batch name of the claim code
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

  if (options.reservedFor && options.codes.length != 1)
    throw new Error('only one code can be reserved for the same email');

  // remove duplicates
  const codes = (options.alreadyClean
    ? options.codes
    : _.uniq(options.codes));
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
      this.claimCodes.push({
        code: code,
        multi: options.multi,
        batchName: options.batchName,
        issuedBy: options.issuedBy,
        reservedFor: options.reservedFor
      });
    }.bind(this));

    return this.save(function (err, result) {
      if (err) return callback(err);
      return callback(null, accepted, rejected);
    });
  }.bind(this));
};

/**
 * Adds a set of random claim codes to the badge.
 *
 * @param {Object} options
 *   - `count`: how many codes to generate
 *   - `codeGenerator`: function to generate random codes (optional)
 *   - `batchName`: batch name to give to each generated code
 *   - `issuedBy` : the user that issued the claim code
 *   - `reservedFor`: email address to reserve the claim code for.
 *       count=1 is implicit when this is non-falsy.
 * @param {Function} callback
 *   Expects `function (err, codes)`
 * @return {[async]}
 *   - `codes`: the codes that got generated
 * @see Badge#addClaimCodes
 */

Badge.prototype.generateClaimCodes = function generateClaimCodes(options, callback) {
  const codeGenerator = options.codeGenerator || phraseGenerator;
  const issuedBy = options.issuedBy;
  const reservedFor = options.reservedFor;
  const batchName = options.batchName;
  const accepted = [];
  const self = this;
  var count = options.count;

  if (reservedFor) count = 1;
  async.until(function isDone() {
    return accepted.length == count;
  }, function addCodes(cb) {
    const numLeft = count - accepted.length;
    const phrases = codeGenerator(numLeft);

    self.addClaimCodes({
      codes: phrases,
      limit: numLeft,
      issuedBy: issuedBy,
      reservedFor: reservedFor,
      batchName: batchName,
      alreadyClean: true,
    }, function (err, acceptedCodes, rejectedCodes) {
      if (err) return cb(err);
      accepted.push.apply(accepted, acceptedCodes);
      return cb(null);
    });
  }, function done(err) {
    if (err) return callback(err);
    callback(null, accepted);
  });
};

Badge.prototype.getClaimCode = function getClaimCode(code) {
  const codes = this.claimCodes;
  const normalizedCode = code.trim().replace(/ /g, '-');
  var idx = codes.length;
  while (idx--) {
    if (codes[idx].code === normalizedCode)
      return codes[idx];
  }
  return null;
};

Badge.prototype.getBatchNames = function getBatchNames() {
  var batchNames = {};

  this.claimCodes.forEach(function(code) {
    if (code.batchName) batchNames[code.batchName] = true;
  });
  return Object.keys(batchNames);
};

Badge.prototype.getClaimCodesForDistribution = function getClaimCodesForDistribution(batchName) {
  return this.claimCodes
    .filter(function(c) {
      if (batchName && c.batchName != batchName) return false;
      return !c.claimedBy && !c.multi && !c.reservedFor;
    })
    .map(util.prop('code'));
};

Badge.prototype.getClaimCodes = function getClaimCodes(opts) {
  opts = _.defaults(opts||{}, {unclaimed: false});

  return this.claimCodes.filter(function(code) {
    if (opts.unclaimed && code.claimedBy) return false;
    if (opts.batchName && code.batchName != opts.batchName) return false;
    return true;
  }).map(function (entry) {
    var claim = {
      code: entry.code,
      claimed: !!entry.claimedBy
    };
    if (entry.reservedFor) claim.reservedFor = entry.reservedFor;
    if (entry.batchName) claim.batchName = entry.batchName;
    return claim;
  });
};

Badge.prototype.claimCodeIsClaimed = function claimCodeIsClaimed(code) {
  const claim = this.getClaimCode(code);
  if (!claim)
    return null;
  return !!(claim.claimedBy && !claim.multi);
};

Badge.prototype.redeemClaimCode = function redeemClaimCode(code, email, cb) {
  const claim = this.getClaimCode(code);
  if (!claim)
    return cb(null, null);
  if (!claim.multi && claim.claimedBy && claim.claimedBy !== email)
    return cb(null, false);
  claim.claimedBy = email;
  Badge.temporaryEvidence.destroy(claim, function(err) {
    if (err) return cb(err);
    cb(null, true);
  });
};

Badge.prototype.removeClaimCode = function removeClaimCode(code, cb) {
  var self = this;
  var claim = this.getClaimCode(code);
  Badge.temporaryEvidence.destroy(claim, function(err) {
    if (err) return cb(err);
    self.claimCodes.pull(claim._id);
    cb();
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

Badge.prototype.reserveAndNotify = function reserveAndNotify(info, callback) {
  if (typeof(info) == 'string') info = {email: info};

  const self = this;
  var email = info.email;
  var issuedBy = info.issuedBy;
  var files = info.evidenceFiles || [];

  BadgeInstance.findOne({
    userBadgeKey: email + '.' + self.id
  }, function (err, instance) {
    if (err) return callback(err);
    if (instance)
      return callback(null, null);
    self.generateClaimCodes({reservedFor: email, issuedBy: issuedBy}, function(err, accepted) {
      if (err) return callback(err);
      var claimCode = accepted[0];
      var claim = self.getClaimCode(claimCode);
      var finish = function(err) {
        if (err) return callback(err);
        webhooks.notifyOfReservedClaim(email, claimCode, files.length);
        return callback(null, claimCode);
      };

      if (!files.length) return finish(null);
      async.series([
        Badge.temporaryEvidence.add.bind(null, claim, files),
        self.save.bind(self)
      ], finish);
    });
  });
};

Badge.prototype.award = function award(options, callback) {
  if (typeof options === 'string')
    options = {user: options};
  const DUP_KEY_ERROR_CODE = 11000;
  const checkForCategoryBadges =
    !this.categoryAward && this.categoryWeight;
  const email = options.user || options.email;
  const categories = this.categories;
  const weight = this.weight;
  const evidence = options.evidence;
  const instance = new BadgeInstance({
    user: email,
    badge: this.id,
    evidence: evidence,
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

    if (!checkForCategoryBadges)
      return callback(null, instance, []);

    Badge.awardCategoryBadges( { email: email, categories: categories }, function(err, instances) {
      if (err) return callback(err);
      return callback(null, instance, instances);
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
    json: '/badge/meta/%s'
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
    image: this.absoluteUrl('image'),
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
  return this.criteria.content
         ? Badge.parseRubricItems(this.criteria.content)
         : [];
};

// #TODO: maybe make this a Program model function?
function isProgramActive(program) {
  const now = Date.now();
  if (!program || (!program.endDate && !program.startDate))
    return true;
  if (!program.endDate)
    return now >= program.startDate;
  if (!program.startDate)
    return program.startDate <= now;
  return (now <= program.endDate &&
          now >= program.startDate);
}

Badge.getRecommendations = function (opts, callback) {
  const prop = util.prop;
  const method = util.method;

  const email = opts.email;
  const limit = opts.limit || Infinity;
  const userAgeRange = opts.ageRange || ALL_AGES;

  // #TODO:
  //   * Be smarter about recommending badges that will complete a
  //     category level badge.
  //
  //   * Be smarter about falling back when a filter reduces the
  //     recommendation set to zero items. For example, in the case
  //     where a user hasn't earned any badges yet, we are going to fall
  //     back completely to `allBadges`, but we should probably still
  //     filter out participation badges.

  BadgeInstance
    .find({user: email})
    .populate('badge')
    .exec(function (err, instances) {
      const earnedBadgeIds = instances.map(prop('badge', '_id'));

      const onTrackCategories = _.chain(instances)
        .map(prop('badge', 'categories'))
        .flatten()
        .uniq()
        .value();

      const completedCategories = instances
        .filter(prop('badge', 'categoryAward'))
        .map(prop('badge', 'categoryAward'));

      const query = {
        _id: { '$nin': earnedBadgeIds },
        type: 'skill',
        activityType: { '$ne': 'offline' },
      };

      const exclude = { image: 0 };

      Badge.find(query, exclude)
        .populate('program')
        .exec(filterRecommendations);
      function filterRecommendations(err, allBadges) {
        if (err) return callback(err);

        const filtered = allBadges
          .filter(function (b) {
            const programIsActive = isProgramActive(b.program);
            const noAgeInappropriate = _.contains(b.ageRange, userAgeRange);
            const noCategoryBadges = !b.categoryAward;
            const noneFromEarnedCategories =
              !_.intersection(b.categories, completedCategories).length;
            const onlyOnTrack =
              _.intersection(b.categories, onTrackCategories).length;
            return (true
                    && noCategoryBadges
                    && noneFromEarnedCategories
                    && onlyOnTrack
                    && noAgeInappropriate
                    && programIsActive
                   );
          });

        // We want to have something to recommend, so we check to see if
        // we've filtered out everything and if we have, resort to
        // shuffling up all the badges and use that. Also, for the API
        // endpoint we need to have fully populated badge classes,
        // including program and issuer, so we filter out any badges
        // that don't have an issuer associated with its program.
        const result = (filtered.length
                        ? filtered
                        : _.shuffle(allBadges))
          .filter(prop('program', 'issuer'))
          .slice(0, limit);

        return async.map(
          result.map(prop('program')),
          method('populate', 'issuer'),
          function (err) {
            if (err) return callback(err);
            return callback(null, result);
          }
        );

      }
    });
};

Badge.prototype.getSimilar = function (email, callback) {
  const defer = global.setImmediate || process.nextTick;
  const wrap = util.objWrap;
  const thisShortname = this.shortname;
  const categories = this.categories;

  if (typeof email == 'function')
    callback = email, email = null;

  const noCategories = !categories || categories.length == 0;

  if (noCategories) {
    return defer(function () {
      callback(null, []);
    });
  }

  // This builds up an array of objects that looks something like
  // this: [{categories: 'science'}, {categories: 'math'}].
  const query = { '$or': categories.map(wrap('categories')) };

  Badge.find(query, function (err, badges) {
    if (err) return callback(err);

    badges = badges.filter(function (badge) {
      return !(badge.shortname == thisShortname);
    });

    if (!email)
      return callback(null, badges);

    // Get all of the badge instances for the email address that was
    // passed in and remove any badge classes that the user already has
    // so we don't recommend them redundant badges.
    BadgeInstance.find({user: email})
      .populate('badge')
      .exec(function (err, instances) {
        if (err) return callback(err);

        const earned = instances.map(function (inst) {
          return (inst.badge && inst.badge.shortname);
        }).filter(Boolean);

        callback(null, badges.filter(function (badge) {
          return !(_.contains(earned, badge.shortname));
        }));
      });
  });

};
module.exports = Badge;
