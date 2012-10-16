var db = require('./');
var mongoose = require('mongoose');
var Badge = require('./badge');
var Schema = mongoose.Schema;
var util = require('../lib/util');

var regex = {
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/
}

var BadgeInstanceSchema = new Schema({
  user: {
    type: String,
    required: true,
    trim: true,
    match: regex.email
  },
  badge: {
    type: String,
    trim: true,
    required: true
  },
  assertion: {
    type: String,
    trim: true,
    required: true
  },
  seen: {
    type: Boolean,
    required: true,
    default: false
  },
  hash: {
    type: String,
    required: true,
  },
  userBadgeKey: {
    type: String,
    required: true,
    unique: true
  },
});
var BadgeInstance = db.model('BadgeInstance', BadgeInstanceSchema);

/**
 * Set the `assertion` by pulling badge by the shortname in the `badge`
 * field and making the assertion with the user from the `user` field.
 *
 * @see Badge#makeAssertion (models/badge.js)
 */

BadgeInstanceSchema.pre('validate', function assertionDefault(next) {
  if (this.assertion) return next();
  Badge.findOne({ shortname: this.badge }, function (err, badge) {
    if (err) return next(err);
    badge.makeAssertion({ recipient: this.user }, function (err, assertion) {
      if (err) return next(err);
      this.assertion = assertion;
      next();
    }.bind(this));
  }.bind(this));
});

/**
 * Set the `hash` field by using `util.hash` to compute the hash for the
 * `assertion` string.
 *
 * @see util.hash (lib/util.js)
 */

BadgeInstanceSchema.pre('validate', function hashDefault(next) {
  if (this.hash) return next();
  this.hash = util.hash(this.assertion);
  next();
});

/**
 * Set the `userBadgeKey` field to be the concatenation of the `user`
 * and `badge` fields.
 */
BadgeInstanceSchema.pre('validate', function userBadgeKeyDefault(next) {
  if (this.userBadgeKey) return next();
  this.userBadgeKey = this.user + '.' + this.badge;
  next();
});

/**
 * Check whether a user has a badge.
 *
 * @param {String} user Email address for user
 * @param {String} shortname The badge shortname
 */

BadgeInstance.userHasBadge = function userHasBadge(user, shortname, callback) {
  var query = { userBadgeKey: user + '.' + shortname };
  BadgeInstance.findOne(query, { user: 1 }, function (err, instance) {
    if (err) return callback(err);
    return callback(null, !!instance);
  });
};

/**
 * Mark all badges for the user as seen
 *
 * @param {String} email
 */

BadgeInstance.markAllAsSeen = function markAllAsSeen(email, callback) {
  var query = { user: email };
  var update = { seen: true };
  var options = { multi: true };
  BadgeInstance.update(query, update, options, callback);
};
BadgeInstance.markAllAsRead = BadgeInstance.markAllAsSeen;

module.exports = BadgeInstance;