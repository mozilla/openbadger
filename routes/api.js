var Badge = require('../models/badge');
exports.badges = function badges(req, res) {
  Badge.find(function (err, badges) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    
    res.send('awesome');
  });
};