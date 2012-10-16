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
    unique: true,
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
  }
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

module.exports = BadgeInstance;