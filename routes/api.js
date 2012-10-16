var Badge = require('../models/badge');
exports.badges = function badges(req, res) {
  Badge.getAll(function (err, badges) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    var result = { status: 'ok', badges: badges };
    res.send(200, result);
  });
};