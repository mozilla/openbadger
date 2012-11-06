var fs = require('fs');
var Badge = require('../models/badge');
var BadgeInstance = require('../models/badge-instance');

exports.create = function create(req, res) {
  var form = req.body;
  var badge = new Badge(form);

  // #TODO: the stuff to do with getting the image from the post,
  // verifying it, reading it and all that should be abstracted, maybe
  // into Badge#fromTemporary?
  var tmpImage = req.files.image;
  if (!tmpImage)
    return res.send(400, 'need to specify an image');
  fs.readFile(tmpImage.path, function (err, imageBuf) {
    if (err)
      return res.send(500, err);
    badge.image = imageBuf;
    badge.save(function (err, result) {
      if (err) {
        err.status = 'error';
        return res.send(500, err);
      }
      return res.redirect('/admin/badge/' + badge.shortname);
    });
  });
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
    if (err) next(err);
    res.redirect('back');
  });
};


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
    // #TODO: don't show the error directly
    if (err)
      return res.send(500, err);
    req.badges = badges;
    next();
  });
};