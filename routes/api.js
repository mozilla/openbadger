const _ = require('underscore');
const async = require('async');
const jwt = require('jwt-simple');
const urlutil = require('url');
const env = require('../lib/environment');
const util = require('../lib/util');
const Badge = require('../models/badge');
const User = require('../models/user');
const BadgeInstance = require('../models/badge-instance');
const Program = require('../models/program');
const Issuer = require('../models/issuer');
const mongoose = require('mongoose');

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
  if (!(program.issuer && typeof(program.issuer) == "object"))
    throw new Error("expected populated program issuer");

  const issuer = program.issuer;
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

  if (program.image)
    programData.imageUrl = program.absoluteUrl('image');

  programData.issuer = {
    name: issuer.name,
    url: issuer.url,
  };

  if (issuer.image)
    programData.issuer.imageUrl = issuer.absoluteUrl('image');

  return programData;
}

exports.jwtSecret = null;

/**
 * Get listing of all badges
 */

exports.badges = function badges(req, res) {
  var result = { status: 'ok', badges : {} };
  Badge.find(function (err, badges) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    badges.filter(function (badge) {
      return !badge.doNotList;
    }).forEach(function (badge) {
      result.badges[badge.shortname] = normalizeBadge(badge);
    });
    return res.send(200, result);
  });
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
      status: 'okay',
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
  }, function (err, instance) {
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

    var success = res.send.bind(res, 200, {
      status: 'ok',
      url: instance.absoluteUrl('assertion'),
    });

    if (successCb)
      return successCb(success);
    return success();
  });
}

exports.getUnclaimedBadgeInfoFromCode = function(req, res, next) {
  getUnclaimedBadgeFromCode(req.query.code, req, res, next, function(badge) {
    return res.json(200, {
      status: 'ok',
      badge: normalizeBadge(badge)
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
      badge.redeemClaimCode(code, email);
      badge.save(function(err) {
        if (err)
          // Well, this is unfortunate, since we've already given them
          // the badge... Not sure what else we can do here, but at least
          // this error condition is highly unlikely.
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

exports.programs = function programs(req, res) {
  Program.find({}, function(err, programs) {
    if (err) {
      return res.send(500, "There was an error retrieving the list of programs");
    }
    var result = { status: 'ok', programs : {} };
    async.map(programs, function(item, callback) {
      item.populate('issuer', function(err) {
        var programData = normalizeProgram(item)
        return callback(err, {name:programData.name,
                              shortname:programData.shortname,
                              imageUrl:programData.imageUrl,
                              issuer:programData.issuer});
      })
    }, function(err, results) {
      result.programs = results;
      return res.json(200, result);
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
      Badge.find({program: program._id}, function(err, badges) {
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
    const origin = env.origin();
    const isXHR = req.headers['x-requested-with'] === 'XMLHttpRequest';
    const now = Date.now()/1000|0;
    var auth, msg;
    if (!token)
      return respondWithError(res, 'missing mandatory `auth` param');
    if (!secret)
      return respondWithError(res, 'issuer has not configured jwt secret');
    try {
      auth = jwt.decode(token, secret);
    } catch(err) {
      return respondWithError(res, 'error decoding JWT: ' + err.message);
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
    return next();
  };
};

function respondWithError(res, reason) {
  return res.send(403, { status: 'forbidden', reason: reason });
}
