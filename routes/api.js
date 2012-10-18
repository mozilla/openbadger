var Badge = require('../models/badge');
var User = require('../models/user');
var BadgeInstance = require('../models/badge-instance');
var util = require('../lib/util');

/**
 * Get listing of all badges
 */

exports.badges = function badges(req, res) {
  var result = { status: 'ok', badges : {} };
  Badge.find(function (err, badges) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    badges.forEach(function (badge) {
      result.badges[badge.shortname] = {
        name: badge.name,
        description: badge.description,
        prerequisites: badge.prerequisites,
        image: badge.absoluteUrl('image'),
        behaviors: badge.behaviors.map(function (behavior) {
          return { name: behavior.shortname, score: behavior.count }
        })
      };
    });
    res.send(200, result);
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
      result.badges = util.toMap(awarded, 'badge');
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
        remaining: remaining
      };
      return obj;
    }, {});

    res.send(statusCode, result);
  });
};


/**
 * Mark all user badges as read.
 */

exports.markAllAsRead = function markAllAsRead(req, res) {
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