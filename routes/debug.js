var async = require('async');
var User = require('../models/user');
var BadgeInstance = require('../models/badge-instance');

exports.showFlushDbForm = function (req, res) {
  return res.render('admin/flush-user-info.html', {
    issuer: req.issuer,
  });
};

exports.flushDb = function flushDb(req, res) {
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
  async.parallel([ flushUsers, flushInstances ], function (err, results) {
    console.dir(err);
    console.dir(results);
    res.redirect(303, '/')
  });
};