const _ = require('underscore');
const fs = require('fs');
const logger = require('../lib/logger');
const Badge = require('../models/badge');
const BadgeInstance = require('../models/badge-instance');
const util = require('../lib/util');
const async = require('async');

function handleTagInput(input) {
  return (
    input
      .trim()
      .split(',')
      .map(util.method('trim'))
      .filter(util.prop('length'))
  );
}

function handleBadgeForm(badge, form) {
  return _.extend(badge, {
    name: form.name,
    program: form.program,
    description: form.description,
    criteria: { content: form.criteria },
    doNotList: !form.list,
    tags: handleTagInput(form.tags),
    category: form.category,
    timeToEarn: form.timeToEarn,
    ageRange: form.ageRange,
    type: form.type,
  });
}

exports.create = function create(req, res, next) {
  const form = req.body;
  const imageBuffer = req.imageBuffer;
  const badge = handleBadgeForm(new Badge, form);
  badge.image = imageBuffer;
  badge.save(function (err, result) {
    if (err) return next(err);
    return res.redirect('/admin/badge/' + badge.shortname);
  });
};

exports.update = function update(req, res, next) {
  const form = req.body;
  const imageBuffer = req.imageBuffer;
  const badge = handleBadgeForm(req.badge, form);
  const redirectTo = '/admin/badge/' + badge.shortname;
  if (imageBuffer)
    badge.image = imageBuffer;
  badge.save(function (err) {
    if (err) return next(err);
    return res.redirect(redirectTo);
  });
};

exports.getUploadedImage = function getUploadedImage(options) {
  var required = (options||{}).required;
  return function (req, res, next) {
    var tmpImage = req.files.image;
    if (!tmpImage.size) {
      if (required)
        return res.send(400, 'need to specify an image');
      return next();
    }
    fs.readFile(tmpImage.path, function (err, imageBuffer) {
      if (err) return next(err);
      req.imageBuffer = imageBuffer;
      return next();
    });
  }
};

exports.destroy = function destroy(req, res) {
  var badge = req.badge;
  return badge.remove(function (err) {
    if (err)
      return res.send(500, err);
    return res.redirect('/');
  });
};

exports.addBehavior = function addBehavior(req, res) {
  var form = req.body;
  var behavior = {
    shortname: form.shortname,
    count: parseInt(form.count, 10)
  };
  var badge = req.badge;
  badge.behaviors.push(behavior);
  badge.save(function (err, result) {
    // #TODO: send better error
    if (err)
      return res.send(500, err);
    return res.redirect('/admin/badge/' + badge.shortname);
  });
};

exports.removeBehavior = function removeBehavior(req, res) {
  var shortname = req.body.shortname;
  var badge = req.badge;
  badge.removeBehavior(shortname);
  badge.save(function (err, result) {
    // #TODO: send better error
    if (err)
      return res.send(500, err);
    return res.redirect('/admin/badge/' + badge.shortname);
  });
};

exports.image = function image(req, res) {
  var badge = req.badge;
  res.type('image/png');
  res.send(badge.image);
};

exports.assertion = function assertion(req, res) {
  var assertionHash = req.param('hash');
  BadgeInstance.findOne({ hash: assertionHash }, function (err, instance) {
    if (err)
      return res.send(500, err);
    if (!instance)
      return res.send(404);
    res.type('json');
    return res.send(200, instance.assertion);
  });
};

exports.addClaimCodes = function addClaimCodes(req, res, next) {
  const badge = req.badge;
  const form = req.body;
  const options = {
    codes: form.codes
      .split('\n')
      .map(util.method('trim'))
      .filter(util.prop('length')),
    multi: !!form.multi
  };
  badge.addClaimCodes(options, function(err) {
    if (err) return next(err);
    return res.redirect('back');
  });
};

exports.removeClaimCode = function removeClaimCode(req, res, next) {
  var code = req.param('code');
  var badge = req.badge;
  badge.removeClaimCode(code);
  badge.save(function (err) {
    if (err) return next(err);
    return res.redirect('back');
  });
};

exports.releaseClaimCode = function releaseClaimCode(req, res, next) {
  var code = req.param('code');
  var badge = req.badge;
  badge.releaseClaimCode(code);
  badge.save(function (err) {
    if (err) return next(err);
    return res.redirect('back');
  });
};

function reportError(err) {
  return { status: 'error', error: err };
}

exports.awardToUser = function awardToUser(req, res, next) {
  var form = req.body;
  var email = (form.email || '').trim();
  var code = (form.code || '').trim();
  var badge = req.badge;
  var claimSuccess = badge.redeemClaimCode(code, email);

  if (claimSuccess === false)
    return res.send({ status: 'already-claimed' });
  if (claimSuccess === null)
    return res.send({ status: 'not-found' });

  badge.awardOrFind(email, function (err, instance) {
    if (err) return res.send(reportError(err));
    badge.save(function (err) {
      if (err) return res.send(reportError(err));
      return res.send({
        status: 'ok',
        assertionUrl: instance.absoluteUrl('assertion')
      });
    });
  });
};

function issueAndEmail(badge) {
  return function (email, callback) {
    if (!util.isEmail(email))
      return callback(null, {email: email, status: 'invalid'});
    badge.award(email, function (err, instance) {
      if (err) return callback(err);
      // #TODO: SHOULD PUT EMAIL CODE HERE
      if (!instance)
        return callback(null, {email: email, status: 'dupe'});
      return callback(null, {email: email, status: 'okay'});
    });
  };
}

exports.issueMany = function issueMany(req, res, next) {
  const badge = req.badge;
  const post = req.body;
  const emails = post.emails
    .trim()
    .split('\n')
    .map(util.method('trim'));
  async.map(emails, issueAndEmail(badge), function (err, results) {
    if (err) return next(err);
    req.flash('results', results);
    return res.redirect(303, 'back');
  });
};

exports.findByClaimCode = function findByClaimCode(options) {
  return function (req, res, next) {
    var code = req.body.code;
    var normalizedCode = code.trim().replace(/ +/g, '-').toLowerCase();
    Badge.findByClaimCode(normalizedCode, function (err, badge) {
      if (err) return next(err);
      if (!badge)
        return res.redirect('/claim?code=' + code + '&missing=true');
      req.badge = badge;
      req.claim = badge.getClaimCode(normalizedCode);
      return next();
    });
  };
};

// #TODO: refactor the following three fuctions into just one, probably
exports.findByShortName = function (options) {
  var required = !!options.required;

  function getName(req) {
    if (options.container === 'param')
      return req.param(options.field);
    return req[options.container][options.field];
  }

  return function findByShortName(req, res, next) {
    var name = getName(req);
    if (!name && required)
      return res.send(404);

    return Badge.findOne({ shortname: name })
      .populate('program')
      .exec(function (err, badge) {
        // #TODO: don't show the error directly
        if (err)
          return res.send(500, err);
        if (!badge && required)
          return res.send(404);

        req.badge = badge;
        if (!badge.program)
          return next();

        return badge.program.populate('issuer', function (err) {
          if (err) return next(err);
          return next();
        });
      });
  };
};

exports.confirmAccess = function confirmAccess(req, res, next) {
  const badge = req.badge;
  const email = req.session.user;
  const hasAccess = badge.program &&
    badge.program.issuer &&
    badge.program.issuer.hasAccess(email);
  if (!hasAccess)
    return res.send(403);
  return next();
};

exports.findById = function findById(req, res, next) {
  Badge.findById(req.param('badgeId'))
    .populate('program')
    .exec(function (err, badge) {
      if (err) return next(err);
      if (!badge) return res.send(404);
      req.badge = badge;
      badge.program.populate('issuer', function (err) {
        if (err) return next(err);
        return next();
      });
    });
};

exports.findByIssuers = function findByIssuers(req, res, next) {
  const issuers = req.issuers;
  if (!issuers.length)
    return next();
  const query = {
    '$or': issuers
      .reduce(function (arr, issuer) {
        return arr.concat(issuer.programs);
      }, [])
      .map(util.prop('_id'))
      .map(util.objWrap('program'))
  };
  Badge.find(query)
    .populate('program')
    .exec(function (err, badges) {
      if (err) return next(err);
      req.badges = badges;
      // #TODO: dry this out, see exports.findAll
      const programs = badges
        .filter(util.prop('program'))
        .map(util.prop('program'));
      const populateIssuers = util.method('populate', 'issuer');
      async.map(programs, populateIssuers, function (err) {
        if (err) return next(err);
        return next();
      });
    });
};

exports.findAll = function findAll(req, res, next) {
  Badge.find({})
    .populate('program')
    .exec(function (err, badges) {
      if (err) return next(err);
      req.badges = badges;
      const programs = badges
        .filter(util.prop('program'))
        .map(util.prop('program'));
      const populateIssuers = util.method('populate', 'issuer');
      async.map(programs, populateIssuers, function (err) {
        if (err) return next(err);
        return next();
      });
    });
};

exports.findNonOffline = function findNonOffline(req, res, next) {
  var query = {
    '$or': [
      {claimCodes: {'$exists': false }} ,
      {claimCodes: {'$size': 0 }}
    ]
  };
  Badge.find(query)
   .populate('program')
    .exec(function (err, badges) {
      if (err) return next(err);
      req.badges = badges;
      const programs = badges
        .filter(util.prop('program'))
        .map(util.prop('program'));
      const populateIssuers = util.method('populate', 'issuer');
      async.map(programs, populateIssuers, function (err) {
        if (err) return next(err);
        return next();
      });
    });
};
