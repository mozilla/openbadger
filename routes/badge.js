var Badge = require('../models/badge');

exports.create = function create(req, res) {
  var form = req.body;
  var badge = new Badge(form);
  badge.save(function (err, result) {
    if (err) {
      err.status = 'error';
      return res.send(500, err);
    }
    return res.redirect('/admin/badge/' + badge.shortname);
  });
};
exports.read = function read(req, res) {};
exports.update = function update(req, res) {};
exports.destroy = function destroy(req, res) {};

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
  res.send('yep, got it');
};

exports.findByShortname = function (options) {
  var required = !!options.required;

  function getName(req) {
    if (options.container === 'param')
      return req.param(options.field);
    return req[options.container][options.field];
  }

  return function findByShortname(req, res, next) {
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