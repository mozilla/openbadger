var fs = require('fs');
var Badge = require('../models/badge');
var BadgeInstance = require('../models/badge-instance');

exports.create = function create(req, res, next) {
  var form = req.body;
  var badge = new Badge({
    name: form.name,
    description: form.description,
    image: req.imageBuffer,
    criteria: { content: form.criteria }
  });
  badge.save(function (err, result) {
    if (err) return next(err);
    return res.redirect('/admin/badge/' + badge.shortname);
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

exports.update = function update(req, res, next) {
  var form = req.body;
  var badge = req.badge;
  var imageBuffer = req.imageBuffer;
  var redirectTo = '/admin/badge/' + badge.shortname;
  badge.name = form.name;
  badge.description = form.description;
  badge.criteria.content = form.criteria;
  if (imageBuffer)
    badge.image = imageBuffer;
  badge.save(function (err) {
    if (err) return next(err);
    return res.redirect(redirectTo);
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
      return res.send(404)
    res.type('json');
    return res.send(200, instance.assertion);
  });
};

function identity(x) { return x };
function instance(method) {
  return function (o) {
    var args = [].slice.call(arguments);
    return o[method].apply(o, args);
  };
}
exports.addClaimCodes = function addClaimCodes(req, res, next) {
  var badge = req.badge;
  var rawCodes = req.body.codes;
  var codes = (rawCodes
    .split('\n')
    .map(instance('trim'))
    .filter(identity));

  badge.addClaimCodes(codes, function(err) {
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
  })
};


exports.awardToUser = function awardToUser(req, res, next) {
  var form = req.body
  var email = (form.email || '').trim();
  var code = (form.code || '').trim();
  var badge = req.badge;
  var couldClaim = badge.redeemClaimCode(code, email);
  if (!couldClaim)
    return res.send({ status: 'already-claimed' })
  badge.awardOrFind(email, function (err, instance) {
    if (err) return res.send({ status: 'error', error: err });
    badge.save(function (err) {
      if (err) return res.send({ status: 'error', error: err });
      return res.send({
        status: 'ok',
        assertionUrl: instance.absoluteUrl('assertion')
      });
    })
  });
};

exports.findByClaimCode = function findByClaimCode(options) {
  return function (req, res, next) {
    var code = req.body.code;
    var normalizedCode = code.trim().replace(/ /g, '-').toLowerCase();
    Badge.findByClaimCode(normalizedCode, function (err, badge) {
      if (err) return next(err);
      if (!badge)
        return res.redirect('/claim?code=' + code + '&missing=true');
      req.badge = badge;
      req.claim = badge.getClaimCode('normalizedCode');
      return next();
    });
  }
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

    Badge.findOne({ shortname: name }, function (err, badge) {
      // #TODO: don't show the error directly
      if (err)
        return res.send(500, err);
      if (!badge && required)
        return res.send(404);
      req.badge = badge;
      return next();
    });
  };
};

exports.findAll = function findAll(req, res, next) {
  Badge.find({}, function (err, badges) {
    if (err) return next(err)
    req.badges = badges;
    return next();
  });
};

exports.findNonOffline = function findNonOffline(req, res, next) {
  var query = {
    '$or': [
      {claimCodes: {'$exists': false }} ,
      {claimCodes: {'$size': 0 }}
    ]
  };
  Badge.find(query, function (err, badges) {
    if (err) return next(err);
    req.badges = badges;
    return next();
  });
};