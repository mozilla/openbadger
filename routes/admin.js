var phrases = require('../lib/phrases');

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
  return res.render('admin/new-badge.html', {
    page: 'new-badge',
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