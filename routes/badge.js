const _ = require('underscore');
const fs = require('fs');
const logger = require('../lib/logger');
const Badge = require('../models/badge');
const BadgeInstance = require('../models/badge-instance');
const Work = require('../models/work');
const util = require('../lib/util');
const async = require('async');

function handleTagInput(input) {
  return (
    (input || '')
      .trim()
      .split(',')
      .map(util.method('trim'))
      .filter(util.prop('length'))
  );
}

function handleModelSaveError(err, res, next) {
  if (err.name == "ValidationError" && err.errors)
    return res.type("text").send(
      422,
      "A validation error occurred on the following fields: " +
      Object.keys(err.errors).sort().map(function(name) {
        return name + " (" + err.errors[name].type + ")";
      }).join(", ") + "."
    );
  return next(err);
}

function safeNumberCast(number, defaultValue) {
  var val = parseFloat(number);
  return isNaN(val) ? defaultValue : val;
}

function handleBadgeForm(badge, form) {
  return _.extend(badge, {
    name: form.name,
    program: form.program,
    description: form.description,
    criteria: { content: form.criteria },
    doNotList: !form.list,
    tags: handleTagInput(form.tags),
    categoryAward: form.categoryAward,
    categoryRequirement: safeNumberCast(form.categoryRequirement, 0),
    categories: form.categories,
    categoryWeight: safeNumberCast(form.categoryWeight, 0),
    timeToEarn: form.timeToEarn,
    ageRange: form.ageRange,
    activityType: form.activityType,
    type: form.type,
  });
}

exports.create = function create(req, res, next) {
  const form = req.body;
  const imageBuffer = req.imageBuffer;
  const badge = handleBadgeForm(new Badge, form);
  badge.image = imageBuffer;
  badge.save(function (err, result) {
    if (err) return handleModelSaveError(err, res, next);
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
    if (err) return handleModelSaveError(err, res, next);
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

exports.destroy = require('./undo').undoablyDelete('badge');

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
  var assertionId = req.param('hash');
  BadgeInstance.findOne({ _id: assertionId }, function (err, instance) {
    if (err)
      return res.send(500, err);
    if (!instance)
      return res.send(404);
    instance.populate('badge', function(err) {
      if (err)
        return res.send(500, err);
      res.type('json');
      return res.send(200, instance.makeAssertion());
    });
  });
};

exports.meta = function meta(req, res) {
  req.badge.populate('program', function(err) {
    if (err)
      return res.send(500, err);
    res.send(200, req.badge.makeJson());
  });
};

exports.getUnclaimedCodesTxt = function getUnclaimedCodesTxt(req, res, next) {
  var codes = req.badge.getClaimCodesForDistribution(req.query.batchName);
  return res.type('text').send(200, codes.join('\n'));
};

exports.addClaimCodes = function addClaimCodes(req, res, next) {
  function goBack(err) {
    if (err) return next(err);
    return res.redirect('back');
  }

  const badge = req.badge;
  const form = req.body;

  if (form.codes) {
    var codes = form.codes
      .split('\n')
      .map(util.method('trim'))
      .filter(util.prop('length'));
    badge.addClaimCodes({
      codes: codes,
      multi: !!form.multi,
      batchName: form.batchName,
      issuedBy: req.session.user,
    }, goBack);
  } else if (form.quantity) {
    var count = parseInt(form.quantity);
    if (count > 0) {
      badge.generateClaimCodes({
        count: count,
        batchName: form.batchName,
        issuedBy: req.session.user,
      }, goBack);
    } else
      goBack();
  }
};

exports.removeClaimCode = function removeClaimCode(req, res, next) {
  var code = req.param('code');
  var badge = req.badge;
  async.series([
    badge.removeClaimCode.bind(badge, code),
    badge.save.bind(badge)
  ], function (err) {
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

var bulkClaimCodeActions = exports.bulkClaimCodeActions = {
  txt: function(req, res, next) {
    return res.redirect(303, '../unclaimed.txt?batchName=' +
                             encodeURIComponent(req.body.batchName));
  },
  html: function(req, res, next) {
    return res.redirect(303, '../unclaimed.html?batchName=' +
                             encodeURIComponent(req.body.batchName));
  }
};

exports.bulkClaimCodeAction = function bulkClaimCodeAction(req, res, next) {
  var action = req.body.action;

  if (action in bulkClaimCodeActions)
    return bulkClaimCodeActions[action](req, res, next);
  return res.send(400, 'invalid action');
};

function reportError(err) {
  return { status: 'error', error: err };
}

exports.awardToUser = function awardToUser(req, res, next) {
  var form = req.body;
  var email = (form.email || '').trim();
  var code = (form.code || '').trim();
  var badge = req.badge;

  badge.redeemClaimCode(code, email, function(err, claimSuccess) {
    if (err) return res.send(reportError(err));

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
  });
};

function reserveAndNotify(badge, evidenceFiles, email, issuedBy, callback) {
  if (!util.isEmail(email))
    return callback(null, {email: email, status: 'invalid'});
  badge.reserveAndNotify({
    email: email,
    issuedBy: issuedBy,
    evidenceFiles: evidenceFiles
  }, function (err, claimCode) {
    if (err) return callback(err);
    if (!claimCode)
      return callback(null, {email: email, status: 'dupe'});
    return callback(null, {
      email: email,
      status: 'ok',
      claimCode: claimCode
    });
  });
}

exports.issueOneWithEvidence = function issueOneWithEvidence(req, res, next) {
  const badge = req.badge;
  const issuedBy = req.session.user;
  var email = req.body.email.trim();
  var files = req.files.evidence;

  if (files) {
    if (!Array.isArray(files))
      files = [files];
  } else
    files = [];

  reserveAndNotify(badge, files, email, issuedBy, function(err, result) {
    if (err) return next(err);
    req.flash('results', [result]);
    return res.redirect(303, 'back');
  });
};

exports.issueMany = function issueMany(req, res, next) {
  const badge = req.badge;
  const issuedBy = req.session.user;
  const post = req.body;
  const emails = post.emails
    .trim()
    .split(/[,; \n]/)
    .map(util.method('trim'));

  function addTask(email, callback) {
    new Work({
      type: 'issue-badge',
      data: {
        badge: badge.id,
        email: email,
        issuedBy: issuedBy,
      }
    }).save(callback);
  }

  async.map(emails, addTask, function (err, results) {
    if (err) return next(err);
    req.flash('results', results);
    return res.redirect(303, 'back');
  });
};

exports.findByClaimCode = function findByClaimCode(options) {
  return function (req, res, next) {
    var code = req.body.code;
    var normalizedCode = code.trim().replace(/ +/g, '-');
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
  const prop = util.prop;
  const wrap = util.objWrap;

  if (!issuers.length)
    return next();

  const query = {
    '$or': issuers
      .reduce(function (arr, issuer) {
        return arr.concat(issuer.programs);
      }, [])
      .map(prop('_id'))
      .map(wrap('program'))
  };
  Badge
    .find(query, {image: 0})
    .populate('program')
    .exec(function (err, allBadges) {
      if (err) return next(err);
      const badges = allBadges.filter(prop('program'));

      // #TODO: dry this out, see exports.findAll
      const programs = badges.map(prop('program'));
      const populateIssuers = util.method('populate', 'issuer');
      async.map(programs, populateIssuers, function (err) {
        if (err)
          return next(err);

        req.badges = badges
          .filter(prop('program', 'issuer'))
          .sort(function (a, b) {
            const strA = [
              (a.program.issuer.name || ''),
              (a.program.name || ''),
              (a.name || ''),
            ].join(':');
            const strB = [
              (b.program.issuer.name || ''),
              (b.program.name || ''),
              (b.name || ''),
            ].join(':');
            return (strA).localeCompare(strB);
          });

        return next();
      });
    });
};

function parseLimit(limit, _default) {
  const DEFAULT = _default || 50;
  const intLimit = parseInt(limit, 10);
  if (intLimit === 0)
    return Infinity;
  return intLimit || DEFAULT;
}

function makeSearchFn(term) {
  if (!term) return null;
  const prop = util.prop;
  const regex = new RegExp(term, 'i');
  return function (badge) {
    return (false
     || regex.test(prop('name')(badge))
     || regex.test(prop('program', 'name')(badge))
     || regex.test(prop('program', 'issuer', 'name')(badge))
    );
  };
}

exports.findAll = function findAll(req, res, next) {
  const page = req.page = parseInt(req.query.page, 10) || 1;
  const limitAmount = req.limit = parseLimit(req.query.limit);
  const skipAmount = limitAmount * (page - 1);

  const query = Badge.find({}, {name: 1, shortname: 1, program: 1});

  const searchFn = makeSearchFn(req.query.search);

  if (!searchFn) {
    query.limit(limitAmount);
    query.skip(skipAmount);
  }

  query.populate('program').exec(function (err, badges) {
    if (err) return next(err);
    const programs = badges
      .filter(util.prop('program'))
      .map(util.prop('program'));
    const populateIssuers = util.method('populate', 'issuer');
    async.map(programs, populateIssuers, function (err) {
      if (err) return next(err);
      req.badges = searchFn ? badges.filter(searchFn) : badges;
      return next();
    });
  });
};
