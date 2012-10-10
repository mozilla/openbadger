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

exports.findByShortname = function findByShortname(req, res, next) {
  var name = req.param('name');
  if (!name) res.send(404);

  Badge.findOne({ shortname: name }, function (err, badge) {
    // #TODO: don't show the error directly
    if (err)
      return res.send(500, err);
    if (!badge)
      return res.send(404);
    req.badge = badge;
    next();
  });
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