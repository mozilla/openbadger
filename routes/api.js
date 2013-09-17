const _ = require('underscore');
const async = require('async');
const mime = require('mime');
const jwt = require('jwt-simple');
const urlutil = require('url');
const env = require('../lib/environment');
const util = require('../lib/util');
const webhooks = require('../lib/webhooks');
const Badge = require('../models/badge');
const User = require('../models/user');
const BadgeInstance = require('../models/badge-instance');
const Program = require('../models/program');
const Issuer = require('../models/issuer');
const mongoose = require('mongoose');
const log = require('../lib/logger');

function normalizeBadge(badge) {
  var badgeData = {
    name: badge.name,
    shortname: badge.shortname,
    description: badge.description,
    prerequisites: badge.prerequisites,
    image: badge.absoluteUrl('image'),
    criteria: badge.criteria && badge.criteria.content,
    tags: badge.tags,
    categoryAward: badge.categoryAward,
    categoryRequirement: badge.categoryRequirement || undefined,
    categoryWeight: badge.categoryWeight || undefined,
    categories: badge.categories,
    ageRange: badge.ageRange,
    type: badge.type,
    activityType: badge.activityType,
    rubric: {
      items: badge.getRubricItems()
    }
  };

  if (badge.program && typeof(badge.program) == "object")
    badgeData.program = normalizeProgram(badge.program);
  else
    badgeData.program = badge.program;

  return badgeData;
}

function inflateBadge(badge, cb) {
  badge.populate('program', function(err) {
    if (err) return cb(err);
    badge.program.populate('issuer', function(err) {
      if (err) return cb(err);
      cb(null, badge);
    });
  });
}

function normalizeProgram(program) {
  if (!(program.issuer && typeof(program.issuer) == "object")) {
    log.fatal({program: program}, "PRE-CRASH: unpopulated program");
    throw new Error("expected populated program issuer");
  }

  const issuer = program.issuer;
  const empty = util.empty;

  var programData = [
    'shortname',
    'name',
    'description',
    'url',
    'contact',
    'startDate',
    'endDate',
    'phone',
  ].reduce(function (out, field) {
    return (out[field] = program[field], out);
  }, {});

  if (!empty(program.image))
    programData.imageUrl = program.absoluteUrl('image');

  programData.issuer = {
    name: issuer.name,
    url: issuer.url,
  };

  if (!empty(issuer.image))
    programData.issuer.imageUrl = issuer.absoluteUrl('image');

  return programData;
}

exports.jwtSecret = null;
exports.limitedJwtSecret = null;

exports.badges = function badges(req, res) {
  function handleError(err) {
    log.error(err);
    return res.send(500, { status: 'error', error: err });
  }

  function sendResults(filteredBadges) {
    var query = { doNotList : false };

    if (filteredBadges) {
      var badgeIds = [];
      filteredBadges.forEach(function (badge) {
        badgeIds.push(badge._id);
      });

      query['_id'] = { '$in' : badgeIds };
    }

    Badge.find(query, '-image -claimCodes', function (err, badges) {
      badges.forEach(function (badge) {
        if (badge.program && typeof(badge.program) == "object")
          badge.program = badge.populated('program');

        result.badges[badge.shortname] = normalizeBadge(badge);
      });

      return res.send(200, result);
    });
  }

  const result = { status: 'ok', badges : {} };
  const searchTerm = req.query.search,
        category = req.query.category,
        ageGroup = req.query.ageGroup,
        badgeType = req.query.badgeType,
        activityType = req.query.activityType;

  if (searchTerm || category || ageGroup || badgeType || activityType) {
    const propertiesToMatch = ['name', 'description', 'program.name', 'program.issuer.name'];
    var query = { doNotList : false };

    if (category) query['categories'] = { '$in' : [category] };
    if (ageGroup) query['ageRange'] = { '$in' : [ageGroup] };
    if (badgeType) query['type'] = { '$in' : [badgeType] };
    if (activityType) query['activityType'] = { '$in' : [activityType] };

    Badge.find(query, 'name description program', function (err, badges) {
      if (err) return handleError(err);

      var filteredBadges = badges.filter(function (badge) {
        return !badge.doNotList;
      });

      if (searchTerm) {
        Badge.populate(filteredBadges, { path: 'program', select: 'name issuer'}, function (err, filteredBadges) {
          if (err) return handleError(err);
          Program.populate(filteredBadges, { path: 'program.issuer', select: 'name', model: Issuer }, function (err, filteredBadges) {
            if (err) return handleError(err);

            const searchFn = util.makeSearch(propertiesToMatch);
            filteredBadges = filteredBadges.filter(searchFn(searchTerm));
            sendResults(filteredBadges);
          });
        });
      }
      else {
        sendResults(filteredBadges);
      }
    });
  }
  else {
    // if we're not doing any searching, we can be a little more efficient.
    sendResults();
  }
};

exports.badge = function badge(req, res) {
  inflateBadge(req.badge, function(err) {
    if (err)
      return res.json(500, { status: 'error', error: err });
    res.json(200, { status: 'ok', badge: normalizeBadge(req.badge) });
  });
};

function parseLimit(userLimit) {
  const DEFAULT_LIMIT = 10;
  const limit = parseInt(userLimit, 10);
  if (isNaN(userLimit))
    return DEFAULT_LIMIT;
  return userLimit;
}

exports.similarBadges = function similarBadges(req, res, next) {
  const badge = req.badge;
  const email = req.query.email;
  const limit = parseLimit(req.query.limit);

  badge.getSimilar(email, function (err, badges) {
    if (err)
      return res.json(500, { status: 'error', error: err });

    if (limit > 0)
      badges = badges.slice(0, limit);

    return res.json(200, {
      status: 'ok',
      badges: badges.map(normalizeBadge)
    });
  });
};

exports.badgeRecommendations = function badgeRecommendations(req, res, next) {
  Badge.getRecommendations({
    email: req.authUser || req.query.email,
    ageRange: req.query.ageRange,
    limit: parseLimit(req.query.limit) || Infinity
  }, function (err, badges) {
    if (err) return res.json(500, {status: 'error', error: err });
    return res.json(200, {
      status: 'ok',
      badges: badges.map(normalizeBadge),
    });
  });
};

exports.badgeClaimCodes = function badgeClaimCodes(req, res, next) {
  const badge = req.badge;
  const queryOpts = req.query;

  // theoretically this should never happen - this route should always
  // be preceded by middleware that finds the badge or 404s.
  if (!badge)
    return res.json(404, {status: 'error', reason: 'badge not found'});

  const options = {
    page: parseInt(queryOpts.page, 10) || 1,
    count: parseInt(queryOpts.count, 10) || 100,
    unclaimed: false,
  };

  if (queryOpts.count === '0' || queryOpts.limit === 'false')
    options.count = Infinity;

  const allCodes = badge.getClaimCodes({
    unclaimed: options.unclaimed
  });
  const someCodes = util.pager(allCodes, {
    page: options.page,
    count: options.count
  });

  return res.json(200, {
    status: 'ok',
    total: allCodes.length,
    claimcodes: someCodes,
    page: options.page,
    count: options.count,
  });
};

function getCreditsAndBadgesForUser(req, res, cb) {
  var email = req.query.email;

  if (!email)
    return res.send(400, {
      status: 'missing-parameter',
      parameter: 'email',
      message: 'You need to pass in a valid email address'
    });

  var result = { behaviors: {}, badges: {} };

  User.getCreditsAndBadges(email, function (err, user) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    result.behaviors = user.behaviors;
    async.forEach(user.badges, function(instance, cb) {
      instance.populate('badge', function(err) {
        if (err) return cb(err);
        result.badges[instance.badge.shortname] = instance;
        cb();
      });
    }, function(err) {
      if (err)
        return res.send(500, { status: 'error', error: err });
      cb(result);
    });
  });
}

/**
 * Get information on a specific user badge
 */

exports.userBadge = function userBadge(req, res) {
  const shortname = req.param('shortname');

  // This is a terribly inefficient way of doing things, but
  // it seems to be the only way, given our current schema. -AV
  getCreditsAndBadgesForUser(req, res, function(info) {
    var instance = info.badges[shortname];
    if (!instance)
      return res.send(404);

    inflateBadge(instance.badge, function(err) {
      if (err)
        return res.send(500, {status: 'error', error: err});
      return res.send(200, {
        status: 'ok',
        badge: {
          isRead: instance.seen,
          issuedOn: instance.issuedOnUnix(),
          assertionUrl: instance.absoluteUrl('assertion'),
          evidence: instance.evidence,
          badgeClass: normalizeBadge(instance.badge)
        }
      });
    });
  });
};

/**
 * Get listing of user's credits and badges
 */

exports.user = function user(req, res) {
  // #TODO: implement auth
  //        ... but isn't auth done by the api.auth() middleware? -AV
  //        yeah this todo is probably old - BJB
  getCreditsAndBadgesForUser(req, res, function(info) {
    var result = {
      status: 'ok',
      behaviors: info.behaviors,
      badges: {}
    };

    Object.keys(info.badges).forEach(function(shortname) {
      var instance = info.badges[shortname];
      result.badges[shortname] = {
        assertionUrl: instance.absoluteUrl('assertion'),
        isRead: instance.seen,
        issuedOn: instance.issuedOnUnix(),
        badgeClass: {
          name: instance.badge.name,
          description: instance.badge.description,
          image: instance.badge.absoluteUrl('image')
        }
      };
    });

    return res.send(200, result);
  });
};

function getUnclaimedBadgeFromCode(code, req, res, next, cb) {
  if (!code)
    return res.json(400, {status: 'error', reason: 'missing claim code'});
  var badge = Badge.findByClaimCode(code, function(err, badge) {
    if (err) return next(err);
    if (!badge)
      return res.json(404, {
        status: 'error',
        reason: 'unknown claim code',
        code: code
      });

    if (badge.claimCodeIsClaimed(code))
      return res.json(409, {
        status: 'error',
        reason: util.format('claim code `%s` has already been used', code),
        code: code
      });

    cb(badge);
  });
};

function tryAwardingBadge(opts, res, successCb) {
  const badge = opts.badge;
  const email = opts.email;
  const evidence = opts.evidence;

  if (!badge)
    return res.json(404, {status: 'error', reason: 'badge not found'});
  if (!email)
    return res.json(400, {status: 'error', reason: 'missing email address'});

  return badge.award({
    email: email,
    evidence: evidence
  }, function (err, instance, autoAwardedInstances) {
    if (err) {
      // TODO: log error properly
      console.dir(err);
      return res.json(500, {
        status: 'error',
        reason: 'database'
      });
    }

    if (!instance)
      return res.json(409, {
        status: 'error',
        reason: util.format('user `%s` already has badge', email),
        user: email,
      });

    function getShortNameFromInstance(instance, cb) {
      instance.populate('badge', function (err) {
        if (err)
          return cb(err);
        return cb(null, instance.badge.shortname);
      });
    }

    return async.map(autoAwardedInstances, getShortNameFromInstance, function (err, autoAwardedShortnames) {
      if (err) {
        return res.json(500, {
          status: 'error',
          reason: 'database'
        });
      }

      var success = res.send.bind(res, 200, {
        status: 'ok',
        url: instance.absoluteUrl('assertion'),
        autoAwardedBadges: autoAwardedShortnames
      });

      if (successCb)
        return successCb(success);
      return success();
    });
  });
}

exports.getUnclaimedBadgeInfoFromCode = function(req, res, next) {
  getUnclaimedBadgeFromCode(req.query.code, req, res, next, function(badge) {
    var claim = badge.getClaimCode(req.query.code);
    var result ={
      status: 'ok',
      evidenceItems: claim.evidence.length,
      badge: normalizeBadge(badge)
    };

    if (claim.reservedFor) result.reservedFor = claim.reservedFor;
    return res.json(200, result);
  });
};

exports.getClaimCodeEvidence = function(req, res, next) {
  var code = req.query.code;
  var n = parseInt(req.query.n);

  if (isNaN(n) || n < 0)
    return res.send(400, {
      status: 'error',
      reason: 'n must be a non-negative integer'
    });

  getUnclaimedBadgeFromCode(code, req, res, next, function(badge) {
    var claim = badge.getClaimCode(code);
    if (n >= claim.evidence.length)
      return res.send(404, {
        status: 'error',
        reason: 'evidence item number does not exist'
      });
    var evidence = claim.evidence[n];
    Badge.temporaryEvidence.getReadStream(evidence, function(err, s) {
      if (err) return res.json(500, {
        status: 'error',
        reason: 'cannot retrieve evidence'
      });
      res.type(evidence.mimeType);
      var ext = mime.extension(evidence.mimeType);
      var filename = 'evidence-' + n + (ext ? '.' + ext : '');
      res.set('Content-Disposition',
              'attachment; filename="' + filename + '"');
      s.pipe(res);
    });
  });
};

exports.awardBadgeFromClaimCode = function(req, res, next) {
  const code = req.body.code;
  const email = req.body.email;
  const evidence = req.body.evidence;

  if (!email)
    return res.json(400, {status: 'error', reason: 'missing email address'});

  getUnclaimedBadgeFromCode(code, req, res, next, function(badge) {
    tryAwardingBadge({
      badge: badge,
      email: email,
      evidence: evidence
    }, res, function(success) {
      async.series([
        badge.redeemClaimCode.bind(badge, code, email),
        badge.save.bind(badge)
      ], function(err) {
        if (err)
          // Well, this is unfortunate, since we've already given them
          // the badge... Not sure what else we can do here, but at least
          // this error condition is unlikely.
          return next(err);
        success();
      });
    });
  });
};

exports.awardBadge = function awardBadge(req, res, next) {
  tryAwardingBadge({
    badge: req.badge,
    email: req.body.email,
    evidence: req.body.evidence
  }, res);
};

exports.removeBadge = function removeBadge(req, res, next) {
  const shortname = req.param('shortname');
  const email = req.body.email;

  if (!email)
    return res.json(400, {status: 'error', reason: 'missing email address'});

  return BadgeInstance.findOneAndRemove({
    badge: shortname,
    user: email
  }, function (err, result) {
    if (err) {
      // TODO: log error properly
      console.dir(err);
      return res.json(500, {
        status: 'error',
        reason: 'database'
      });
    }

    if (!result)
      return res.json(404, {
        status: 'error',
        reason: util.format('user `%s` does not have that badge', email),
        user: email,
      });
    return res.json(200, {status: 'ok'});
  });
};

/**
 * Credit a user with a behavior
 */
exports.credit = function credit(req, res) {
  // #TODO: authentication
  var form = req.body;
  var behavior = req.param('behavior');

  if (!form.email)
    return res.send(400, {
      status: 'missing-parameter',
      parameter: 'email',
      message: 'You need to pass in a valid email address'
    });

  User.credit(form.email, behavior, function (err, user, awarded, inProgress) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    var statusCode = 200;
    var result = { status: 'ok' };

    if (awarded.length) {
      statusCode = 201;
      result.status = 'awarded';
      result.badges = awarded.reduce(function (obj, instance) {
        obj[instance.badge] = {
          assertionUrl: instance.absoluteUrl('assertion'),
          isRead: instance.seen,
          issuedOn: instance.issuedOnUnix(),
        };
        return obj;
      }, {});
    }

    // `inProgress` is an array of objects representing all the badges
    // that the user has credit towards and how many behaviors the user
    // has remaining until that badge is earned:
    // `{ badge: { ... }, remaining: { ... }`
    // We want to simplify it down to a map, keyed by badge shortname,
    // with just the remaining number of behaviors.
    result.progress = inProgress.reduce(function (obj, progress) {
      var badge = progress.badge;
      var remaining = progress.remaining;
      obj[badge.shortname] = {
        name: badge.name,
        description: badge.description,
        image: badge.absoluteUrl('image'),
        remaining: remaining
      };
      return obj;
    }, {});

    return res.send(statusCode, result);
  });
};


/**
 * Mark all user badges as read.
 */

exports.markAllBadgesAsRead = function markAllBadgesAsRead(req, res) {
  var form = req.body;

  if (!form.email)
    return res.send(400, {
      status: 'missing-parameter',
      parameter: 'email',
      message: 'You need to pass in a valid email address'
    });

  BadgeInstance.markAllAsRead(form.email, function (err) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    return res.send(200, { status: 'ok' });
  });
};

/**
 * List the issuers
 */

exports.issuers = function issuers(req, res) {
  Issuer.find({}, function(err, issuers) {
    if (err) {
      return res.send(500, "There was an error retrieving the list of issuers");
    }
    var result = { status: 'ok', issuers : {} };
    issuers.forEach(function(item) {
      result.issuers[item.shortname] = {
        name: item.name,
        shortname: item.shortname,
        url: item.url
      };
    });
    return res.json(200, result);
  });
};

exports.issuer = function issuer(req, res, next) {
  const issuerShortName = req.params.issuerShortName;
  const query = {shortname: issuerShortName};
  Issuer.findOne(query, function(err, issuer) {
    if (err)
      return res.send(500, "There was an error retrieving the issuer");
    if (!issuer)
      return res.send(404);
    const issuerData = [
      'shortname',
      'name',
      'description',
      'url',
      'contact',
    ].reduce(function (out, field) {
      return (out[field] = issuer[field], out);
    }, {});
    issuerData.imageUrl = issuer.absoluteUrl('image');
    return res.json(200, {
      status: 'ok',
      issuer: issuerData,
    });
  });
};


function createFilterFn(query) {
  const prop = util.prop;

  return function filterProgram(program, cb) {
    // immediately reject orphaned programs
    if (!program.issuer)
      return cb(false);

    if (!_.keys(query).length)
      return cb(true);

    program.findBadges(function (err, badges) {
      if (err) {
        log.error(err, 'could not find badges for a program');
        return cb(false);
      }
      const organization = program.issuer.shortname;
      const categories = _.chain(badges)
        .map(prop('categories'))
        .flatten()
        .uniq()
        .value();
      const ageRanges = _.chain(badges)
        .map(prop('ageRange'))
        .flatten()
        .uniq()
        .value();
      const activityTypes = badges.map(prop('activityType'));

      if (query.org && query.org !== organization)
        return cb(false);

      if (query.category &&
          !_.contains(categories, query.category))
        return cb(false);

      if (query.age &&
          !_.contains(ageRanges, query.age))
        return cb(false);

      if (query.activity &&
          !_.contains(activityTypes, query.activity))
        return cb(false);

      if (query.search) {
        if (!(new RegExp(query.search, 'i')).test(program.name))
        {
          const badgePropertiesToMatch = ['name', 'description'];
          const badgeSearchFn = util.makeSearch(badgePropertiesToMatch);
          if (!badges.some(badgeSearchFn(query.search))) {
            return cb(false);
          }
        }
      }

      return cb(true);
    });
  };
};

exports.programs = function programs(req, res) {
  const filterProgram = createFilterFn(req.query);

  function sendError(err, msg) {
    return res.json(500, {
      status: 'error',
      error: msg || err
    });
  }

  Program.find({})
    .populate('issuer')
    .exec(function(err, programs) {
      if (err)
        return sendError(err, "There was an error retrieving the list of programs");

      async.filter(programs, filterProgram, function (programs) {
        return res.json(200, {
          status: 'ok',
          programs: programs.map(function (program) {
            const programData = normalizeProgram(program);
            return {
              name: programData.name,
              shortname: programData.shortname,
              imageUrl: programData.imageUrl,
              issuer: programData.issuer
            };
          })
        });
      });
    });
};

exports.program = function program(req, res) {
  const programShortName = req.params.programShortName;
  const query = {shortname: programShortName};
  Program.findOne(query, function(err, program) {
    if (err)
      return res.send(500, "There was an error retrieving the program");
    if (!program)
      return res.send(404);
    program.populate('issuer', function(err) {
      if (err)
        return res.send(500, "There was an error retrieving issuer info");
      var programData = normalizeProgram(program);
      programData.earnableBadges = {};
      Badge.find({
        program: program._id,
        doNotList: {'$ne': true }
      }, function(err, badges) {
        if (err)
          return res.send(500, "There was an error getting earnable badges");
        badges.forEach(function(badge) {
          programData.earnableBadges[badge.shortname] = normalizeBadge(badge);
        });
        return res.json(200, {
          status: 'ok',
          program: programData,
        });
      });
    });
  });
};

exports.testWebhook = function testWebhook(req, res) {
  webhooks.notifyOfReservedClaim(req.body.email, req.body.claimCode, req.body.evidenceItems, function(err, body) {
    if (err)
      return res.json(502, {
        status: 'error',
        error: err.toString()
      });
    return res.json(200, {
      status: 'ok',
      body: body
    });
  }, true);
};

/**
 * (Middleware) Confirm that a request is authenticated by decoding the
 * JWT param and confirming audience and issuer.
 */

exports.auth = function auth(options) {
  options = _.defaults(options||{}, {
    user: true
  });
  return function (req, res, next) {
    const param = req.method === "GET" ? req.query : req.body;
    const token = param.auth;
    const email = param.email;
    const secret = exports.jwtSecret;
    const limitedSecret = exports.limitedJwtSecret;
    const origin = env.origin();
    const isXHR = req.headers['x-requested-with'] === 'XMLHttpRequest';
    const now = Date.now()/1000|0;
    var auth, msg;
    var limitedAccess = false;
    if (!limitedSecret) limitedSecret = secret;
    if (!token)
      return respondWithError(res, 'missing mandatory `auth` param');
    if (!secret)
      return respondWithError(res, 'issuer has not configured jwt secret');
    try {
      auth = jwt.decode(token, secret);
    } catch(err) {
      try {
        auth = jwt.decode(token, limitedSecret);
        limitedAccess = true;
      } catch (err) {
        return respondWithError(res, 'error decoding JWT: ' + err.message);
      }
    }
    if (options.user && auth.prn !== email) {
      msg = '`prn` mismatch: given %s, expected %s';
      return respondWithError(res, util.format(msg, auth.prn, email));
    }
    // If the token has an expiration, ensure that it has not passed.
    // XXX: Should we require an expiration field? It will help prevent
    // against unauthorized token reuse.
    if (auth.exp && auth.exp < now) {
      msg = 'Token has expired';
      return respondWithError(res, msg);
    }
    req.authUser = email;
    req.authIsLimited = limitedAccess;
    return next();
  };
};

function respondWithError(res, reason) {
  return res.send(403, { status: 'forbidden', reason: reason });
}
