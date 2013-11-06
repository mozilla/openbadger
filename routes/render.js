const Issuer = require('../models/issuer');
const Program = require('../models/program');
const Badge = require('../models/badge');
const phrases = require('../lib/phrases');
const logger = require('../lib/logger');
const async = require('async');
const _ = require('underscore');

/*
 * Administrative Pages
 */

exports.issuerIndex = function (req, res) {
  return res.render('admin/issuer-index.html', {
    page: 'issuer-index',
    badges: req.badges,
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf
  });
};

exports.issueBadge = function (req, res) {
  return res.render('admin/issue-badge.html', {
    page: 'issue-badge',
    badge: req.badge,
    results: req.flash('results').pop(),
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
  });
};

exports.login = function (req, res) {
  return res.render('admin/login.html', {
    page: 'login',
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
  });
};

exports.newBadgeForm = function (req, res) {
  return res.render('admin/create-or-edit-badge.html', {
    page: 'new-badge',
    badge: new Badge,
    issuers: req.issuers,
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
  });
};

exports.editBadgeForm = function (req, res) {
  return res.render('admin/create-or-edit-badge.html', {
    page: 'edit-badge',
    editing: true,
    badge: req.badge,
    issuers: req.issuers,
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
  });
};

exports.newIssuerForm = function (req, res) {
  return res.render('admin/create-or-edit-issuer.html', {
    page: 'new-issuer',
    issuer: new Issuer,
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
  });
};

exports.newProgramForm = function (req, res) {
  return res.render('admin/create-or-edit-program.html', {
    page: 'new-program',
    program: new Program,
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
  });
};

exports.editProgramForm = function (req, res) {
  return res.render('admin/create-or-edit-program.html', {
    page: 'edit-program',
    editing: true,
    program:  req.program,
    issuers: req.issuers,
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
  });
};

exports.editIssuerForm = function (req, res) {
  return res.render('admin/create-or-edit-issuer.html', {
    page: 'edit-issuer',
    editing: true,
    issuer: req.issuer,
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
  });
};

exports.newBehaviorForm = function (req, res) {
  return res.render('admin/new-behavior.html', {
    page: 'new-behavior',
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
    badgeShortName: req.query['for']
  });
};

exports.badgeIndex = function (req, res) {
  // get the count of issued badges for each badge
  async.map(req.badges,
            function(badge, callback) {
              badge.issuedBadgesCount(function(err, count) {
                badge.issuedCount = count;
                callback(err, badge);
              });
            },
            function (err, badges) {
              // get the total badge count
              var badgeCount = _.reduce(req.badges,
                                        function(memo, badge) {
                                          return memo + badge.issuedCount;
                                        }, 0);
              return res.render('admin/badge-index.html', {
                page: 'home',

                limit: req.limit,
                pageNumber: req.page,
                search: req.query.search,

                issuers: req.issuers,
                user: req.session.user,
                access: req.session.access,
                csrf: req.session._csrf,
                badges: req.badges,
                badgeCount: badgeCount,
                undoRecords: req.undoRecords,
                behaviors: req.behaviors
              });
            });
};

exports.showBadge = function (req, res) {
  return res.render('admin/show-badge.html', {
    page: 'edit-badge',
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
    defaultBehavior: req.query['behavior'],
    badge: req.badge,
    behaviors: req.behaviors
  });
};

exports.criteria = function criteria(req, res) {
  return res.render('public/criteria.html', {
    badge: req.badge,
    user: req.session.user,
    csrf: req.session._csrf,
  });
}

exports.anonymousHome = function all(req, res) {
  return res.render('public/anonymous-home.html', {
    user: req.session.user,
    csrf: req.session._csrf,
  });
};

exports.claim = function claim(req, res) {
  return res.render('public/claim.html', {
    csrf: req.session._csrf,
    code: req.query.code,
    missing: req.query.missing,
    user: req.session.user,
  });
};

exports.confirmClaim = function confirmClaim(req, res) {
  return res.render('public/confirm-claim.html', {
    csrf: req.session._csrf,
    code: req.body.code,
    claim: req.claim,
    badge: req.badge,
    user: req.session.user,
  });
};

exports.manageClaimCodes = function (req, res) {
  return res.render('admin/manage-claim-codes.html', {
    page: 'edit-badge',
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
    badge: req.badge,
    codes: req.badge.claimCodes,
    exampleCode: phrases(1)
  });
};

exports.getUnclaimedCodesHtml = function (req, res) {
  return res.render('admin/claim-code-printout.html', {
    badge: req.badge,
    batchName: req.query.batchName,
    claimUrlText: process.env.OPENBADGER_CLAIM_URL_TEXT,
    claimCodes: req.badge.getClaimCodesForDistribution(req.query.batchName),
  });
};

exports.showFlushDbForm = function (req, res) {
  return res.render('admin/flush-user-info.html', {
    page: 'flush',
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf
  });
};

exports.userList = function userList(req, res, next) {
  return res.render('admin/user-list.html', {
    page: 'user-list',
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
    users: req.users
  });
};

exports.stats = function stats(req, res, next) {
  return res.render('admin/stats.html', {
    page: 'stats',
    stats: req.stats,
    user: req.session.user,
    access: req.session.access,
    csrf: req.session._csrf,
    users: req.users
  });
};

exports.notFound = function notFound(req, res, next) {
  res.status(404);
  return res.render('public/404.html', {});
};

exports.nextError = function nextError(req, res, next) {
  return next(new Error('some error'));
};

exports.errorHandler = function (err, req, res, next) {
  logger.error(err, 'there was an error at ' + req.url);
  res.status(500);
  return res.render('public/500.html');
};
