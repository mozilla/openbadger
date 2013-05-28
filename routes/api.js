const _ = require('underscore');
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

function normalize(badge) {
  return {
    name: badge.name,
    description: badge.description,
    prerequisites: badge.prerequisites,
    image: badge.absoluteUrl('image'),
    behaviors: badge.behaviors.map(function (behavior) {
      return { name: behavior.shortname, score: behavior.count };
    })
  };
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
      result.badges[badge.shortname] = normalize(badge);
    });
    return res.send(200, result);
  });
};


exports.badge = function badge(req, res) {
  res.json({ status: 'ok', badge: normalize(req.badge) });
};

exports.recommendations = function recommendations(req, res, next) {
  const badge = req.badge;
  badge.getRecommendations(req.query.email, function (err, badges) {
    if (err)
      return res.json(500, { status: 'error', error: err });
    return res.json(200, {
      status: 'okay',
      badges: badges.map(normalize)
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


/**
 * Get listing of user's credits and badges
 */

exports.user = function user(req, res) {
  // #TODO: implement auth
  var email = req.query.email;
  if (!email)
    return res.send(400, {
      status: 'missing-parameter',
      parameter: 'email',
      message: 'You need to pass in a valid email address'
    });

  var result = { status: 'ok', behaviors: {}, badges: {} };
  User.getCreditsAndBadges(email, function (err, user) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    result.behaviors = user.behaviors;
    user.badges.forEach(function (instance) {
      result.badges[instance.badge] = {
        assertionUrl: instance.absoluteUrl('assertion'),
        isRead: instance.seen,
        issuedOn: instance.issuedOnUnix(),
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

exports.getUnclaimedBadgeInfoFromCode = function(req, res, next) {
  getUnclaimedBadgeFromCode(req.query.code, req, res, next, function(badge) {
    return res.json(200, {
      status: 'ok',
      badge: normalize(badge)
    });
  });
};

exports.awardBadgeFromClaimCode = function(req, res, next) {
  const code = req.body.code;
  const email = req.body.email;

  if (!email)
    return res.json(400, {status: 'error', reason: 'missing email address'});

  getUnclaimedBadgeFromCode(code, req, res, next, function(badge) {
    badge.redeemClaimCode(code, email);

    // TODO: We're redeeming the claim code before awarding the badge,
    // which is unfortunate if awarding the badge fails for some reason;
    // would be nice to make this transactional.
    badge.save(function(err) {
      if (err) return next(err);
      req.badge = badge;
      return exports.awardBadge(req, res, next);
    });
  });
};

exports.awardBadge = function awardBadge(req, res, next) {
  const badge = req.badge;
  const email = req.body.email;
  if (!badge)
    return res.json(404, {status: 'error', reason: 'badge not found'});
  if (!email)
    return res.json(400, {status: 'error', reason: 'missing email address'});

  return badge.award(email, function (err, instance) {
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
    return res.json(200, {
      status: 'ok',
      url: instance.absoluteUrl('assertion'),
    });
  });
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
    programs.forEach(function(p) {
      result.programs[p.shortname] = {name: p.name, shortname: p.shortname };
    });
    return res.json(200, result);
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
    const programData = [
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
    programData.imageUrl = program.absoluteUrl('image');
    return res.json(200, {
      status: 'ok',
      program: programData,
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
    return next();
  };
};

function respondWithError(res, reason) {
  return res.send(403, { status: 'forbidden', reason: reason });
}
