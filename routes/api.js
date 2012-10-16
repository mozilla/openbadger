var Badge = require('../models/badge');
var User = require('../models/user');

/**
 * Get listing of all badges
 */

exports.badges = function badges(req, res) {
  Badge.getAll(function (err, badges) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    var result = { status: 'ok', badges: badges };
    res.send(200, result);
  });
};


/**
 * Get listing of user's credits and badges
 */

exports.user = function (req, res) {
  // #TODO: implement auth
  var email = req.query.email;
  if (!email)
    return res.send(400, {
      status: 'missing-parameter',
      parameter: 'email',
      message: 'You need to pass in a valid email address'
    });

  User.getCreditsAndBadges(email, function (err, result) {
    if (err)
      return res.send(500, { status: 'error', error: err });
    result.status = 'ok';
    return res.send(200, result);
  });
};