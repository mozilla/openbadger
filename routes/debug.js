const jwt = require('jwt-simple');
const async = require('async');
const User = require('../models/user');
const BadgeInstance = require('../models/badge-instance');

function removeItem(item, callback) {
  return item.remove(callback);
}
function removeAfterFind(callback) {
  return function (err, items) {
    if (err) return callback(err);
    return async.map(items, removeItem, callback);
  };
}
function flushUsers(callback) {
  User.find(removeAfterFind(callback));
}
function flushInstances(callback) {
  BadgeInstance.find(removeAfterFind(callback));
}

exports.generateToken = function generateToken(req, res) {
  const param = req.query;
  const secret = param.secret;
  delete param.secret;
  res.type('text').send(200, jwt.encode(param, secret));
};

exports.flushDb = function flushDb(req, res) {
  async.parallel([ flushUsers, flushInstances ], function (err, results) {
    console.dir(err);
    console.dir(results);
    res.redirect(303, '/');
  });
};
