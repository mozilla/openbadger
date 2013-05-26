var db = require('./');
var mongoose = require('mongoose');
var async = require('async');
var Badge = require('./badge');
var Schema = mongoose.Schema;

var regex = {
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/
}

var UserSchema = new Schema({
  user: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    match: regex.email
  },

  // `credit` is an object keyed by the shortname of a behavior with the
  // value being the amount of credit the user has for that behavior.
  // e.g., `{ 'link': 1, 'comment': 2, 'image-tag': 6 }`
  // An array of objects might be more natural, but this is preferable
  // because it enables a much cheaper update operation.
  credit: {
    type: Schema.Types.Mixed
  }
});
var User = db.model('User', UserSchema);

/**
 * Apply credits to a user's account. Will create an entry if necessary.
 *
 * @param {String} userEmail
 * @param {Array} behaviors
 */

User.credit = function credit(userEmail, behaviors, callback) {
  throw new Error("unimplemented - not needed for CSOL");
};

/**
 * Get all user's credits and badges by email address.
 *
 * @param {String} email
 */

User.getCreditsAndBadges = function getCreditsAndBadges(email, callback) {
  var BadgeInstance = require('./badge-instance');
  var query = { user: email };
  var exclude = { '__v': 0 };
  function getUserCredits(callback) {
    User.findOne(query, exclude, callback);
  }
  function getUserBadges(callback) {
    BadgeInstance.find(query, exclude, callback);
  }
  async.parallel({
    user: getUserCredits,
    badges: getUserBadges
  }, function (err, results) {
    if (err)
      return callback(err);
    var retval = {
      behaviors: results.user ? results.user.credit : {},
      badges: results.badges
    };
    return callback(null, retval);
  });
};

module.exports = User;
