var async = require('async');
var User = require('../models/user');
var BadgeInstance = require('../models/badge-instance');

function removeItem(item, callback) {
  return item.remove(callback);
}
function removeAfterFind(callback) {
  return function (err, items) {
    if (err) return callback(err);
    return async.map(items, removeItem, callback);
  }
}
function flushUsers(callback) {
  User.find(removeAfterFind(callback));
}
function flushInstances(callback) {
  BadgeInstance.find(removeAfterFind(callback));
}

exports.flushDb = function flushDb(req, res) {
  async.parallel([ flushUsers, flushInstances ], function (err, results) {
    console.dir(err);
    console.dir(results);
    res.redirect(303, '/')
  });
};