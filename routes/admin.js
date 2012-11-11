var Badge = require('../models/badge');
var phrases = require('../lib/phrases');
var logger = require('../lib/logger');
/*
 * Administrative Pages
 */
exports.login = function (req, res) {
  var path = req.query['path'] || req.body['path'] || '/admin';
  return res.render('admin/login.html', {
    page: 'login',
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf,
    issuerCheckExempt: true,
    path: path
  });
}

exports.newBadgeForm = function (req, res) {
  return res.render('admin/create-or-edit-badge.html', {
    page: 'new-badge',
    badge: new Badge,
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf,
  });
};

exports.editBadgeForm = function (req, res) {
  return res.render('admin/create-or-edit-badge.html', {
    page: 'edit-badge',
    editing: true,
    badge: req.badge,
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf,
  });
};

exports.newBehaviorForm = function (req, res) {
  return res.render('admin/new-behavior.html', {
    page: 'new-behavior',
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf,
    badgeShortName: req.query['for']
  });
};

exports.badgeIndex = function (req, res) {
  return res.render('admin/badge-index.html', {
    page: 'home',
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf,
    badges: req.badges,
    behaviors: req.behaviors
  });
};

exports.showBadge = function (req, res) {
  return res.render('admin/show-badge.html', {
    page: 'edit-badge',
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf,
    defaultBehavior: req.query['behavior'],
    badge: req.badge,
    behaviors: req.behaviors
  });
};

exports.criteria = function criteria(req, res) {
  return res.render('public/criteria.html', {
    badge: req.badge,
  });
}

exports.all = function all(req, res) {
  return res.render('public/all.html', {
    badges: req.badges,
  });
};

exports.claim = function claim(req, res) {
  return res.render('public/claim.html', {
    csrf: req.session._csrf,
    code: req.query.code,
    missing: req.query.missing,
  });
};

exports.confirmClaim = function confirmClaim(req, res) {
  return res.render('public/confirm-claim.html', {
    csrf: req.session._csrf,
    code: req.body.code,
    claim: req.claim,
    badge: req.badge,
  });
};

exports.manageClaimCodes = function (req, res) {
  return res.render('admin/manage-claim-codes.html', {
    page: 'edit-badge',
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf,
    badge: req.badge,
    codes: req.badge.claimCodes,
    exampleCode: phrases(1)
  });
};

exports.configure = function (req, res) {
  return res.render('admin/config.html', {
    page: 'configure',
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf,
    issuerCheckExempt: true
  });
};

exports.showFlushDbForm = function (req, res) {
  return res.render('admin/flush-user-info.html', {
    page: 'flush',
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf
  });
};

exports.userList = function userList(req, res, next) {
  return res.render('admin/user-list.html', {
    page: 'user-list',
    issuer: req.issuer,
    user: req.session.user,
    csrf: req.session._csrf,
    users: req.users
  });
};

exports.notFound = function notFound(req, res, next) {
  res.status(404)
  return res.render('public/404.html', {});
};

exports.nextError = function nextError(req, res, next) {
  return next(new Error('some error'));
};

exports.errorHandler = function (err, req, res, next) {
  logger.error('there was an error at ' + req.url, err);
  res.status(500);
  return res.render('public/500.html');
};
