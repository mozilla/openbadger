var util = require('util');
var Behavior = require('../models/behavior');

exports.create = function create(req, res) {
  var form = req.body;
  var behavior = new Behavior(form);
  var badgeShortName = form['for-badge'];
  return behavior.save(function (err) {
    if (err)
      return res.send(500, err);
    if (!badgeShortName)
      return res.redirect('/admin/');
    var tpl = '/admin/badge/%s?behavior=%s';
    var url = util.format(tpl, badgeShortName, behavior.shortname);
    return res.redirect(url);
  });
};

exports.readAll = function readAll(req, res) {
  return Behavior.find(genericResponse(res));
};

exports.readOne = function readOne(req, res) {
  return res.send(req.behavior);
};

exports.update = function update(req, res) {
  var form = req.body;
  var behavior = req.behavior;
  return behavior.update(form, genericResponse(res));
};

exports.destroy = function destroy(req, res) {
  var behavior = req.behavior;
  return behavior.remove(function (err) {
    if (err)
      return respondWithError(res, err);
    return res.redirect('/');
  });
};

exports.findByShortName = function findByShortName(req, res, next) {
  var shortname = req.param('shortname');
  if (!shortname)
    return res.send(404, { status: 'not found' });
  Behavior.findOne({shortname: shortname}, function (err, behavior) {
    if (err)
      return respondWithError(res, err);
    if (!behavior)
      return res.send(404, { status: 'not found' });
    req.behavior = behavior;
    return next();
  });
};

exports.findAll = function findAll(req, res, next) {
  Behavior.find({}, function (err, behaviors) {
    if (err)
      return respondWithError(res, err);
    req.behaviors = behaviors;
    return next();
  });
};

function genericResponse(res) {
  return function response(err, results) {
    if (err)
      return respondWithError(res, err);
    return respondWithSuccess(res, results);
  };
}

function respondWithError(res, err) {
  return res.send(500, {
    status: 'error',
    message: err.message
  });
}

function respondWithSuccess(res, result) {
  var status = 200;
  if (typeof result === 'undefined' || result === null)
    status = 404;
  return res.send(status, {
    status: 'ok',
    result: result
  });
}