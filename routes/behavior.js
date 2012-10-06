var Behavior = require('../models/behavior');

exports.create = function create(req, res) {
  var form = req.body;
  var behavior = new Behavior(form);
  behavior.save(genericResponse(res));
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
      return respondWithError(res, err)
    return res.send(200, {status: 'ok'});
  });
};

exports.middleware = {}
exports.middleware.findByName = function findByName(req, res, next) {
  var name = req.param('name');
  if (!name )
    return res.send(404, { status: 'not found' });
  Behavior.findOne({name: name}, function (err, behavior) {
    if (err)
      return respondWithError(res, err);
    if (!behavior)
      return res.send(404, { status: 'not found' });
    req.behavior = behavior;
    return next();
  });
};

function genericResponse(res) {
  return function response(err, results) {
    if (err)
      return respondWithError(res, err);
    return respondWithSuccess(res, results);
  };
};

function respondWithError(res, err) {
  return res.send(500, {
    status: 'error',
    message: err.message
  });
};

function respondWithSuccess(res, result) {
  var status = 200;
  if (typeof result === 'undefined' || result === null)
    status = 404;
  return res.send(status, {
    status: 'ok',
    result: result
  });
};