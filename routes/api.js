const _ = require('underscore');
const jwt = require('jwt-simple');
const urlutil = require('url');
const env = require('../lib/environment');
const util = require('../lib/util');
const Badge = require('../models/badge');
const User = require('../models/user');
const BadgeInstance = require('../models/badge-instance');

/**
 * Get listing of all badges
 */

exports.badges = function badges(req, res) {
  var result = { status: 'ok', badges : {} };
  Badge.find(function (err, badges) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    badges = badges.filter(function (badge) {
      return badge.claimCodes.length === 0;
    });
    badges.forEach(function (badge) {
      result.badges[badge.shortname] = {
        name: badge.name,
        description: badge.description,
        prerequisites: badge.prerequisites,
        image: badge.absoluteUrl('image'),
        behaviors: badge.behaviors.map(function (behavior) {
          return { name: behavior.shortname, score: behavior.count };
        })
      };
    });
    return res.send(200, result);
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
 * (Middleware) Confirm that a request is authenticated by decoding the
 * JWT param and confirming audience and issuer.
 */

exports.auth = function auth(options) {
  options = _.defaults(options||{}, {
    user: true
  });
  return function (req, res, next) {
    const param = req.method === "POST" ? req.body : req.query;
    const token = param.auth;
    const email = param.email;
    const issuer = req.issuer;
    const secret = issuer.jwtSecret;
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
