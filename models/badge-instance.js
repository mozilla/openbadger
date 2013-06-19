const async = require('async');
const db = require('./');
const env = require('../lib/environment');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const util = require('../lib/util');

const regex = {
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/i
};

const BadgeInstanceSchema = new Schema({
  _id: {
    type: String,
    unique: true,
    required: true,
    default: db.generateId,
  },
  user: {
    type: String,
    required: true,
    trim: true,
    match: regex.email
  },
  badge: {
    type: String,
    ref: 'Badge',
  },
  issuedOn: {
    type: Date,
    trim: true,
    required: true,
    default: Date.now
  },
  evidence: {
    type: String,
    trim: true,
  },
  seen: {
    type: Boolean,
    required: true,
    default: false
  },
  userBadgeKey: {
    type: String,
    required: true,
    unique: true
  },
});
const BadgeInstance = db.model('BadgeInstance', BadgeInstanceSchema);

BadgeInstanceSchema.pre('validate', function hashDefault(next) {
  if (this.hash || !this.assertion) return next();
  this.hash = util.hash(this.assertion);
  return next();
});

BadgeInstanceSchema.pre('validate', function userBadgeKeyDefault(next) {
  if (this.userBadgeKey) return next();
  const id = (typeof this.badge == 'object')
    ? this.badge._id
    : this.badge;
  this.userBadgeKey = this.user + '.' + id;
  return next();
});

BadgeInstance.findByCategory = function (user, category, callback) {
  BadgeInstance.find({user: user})
    .populate('badge')
    .exec(function (err, instances) {
      if (err) return callback(err);
      const valid = instances.filter(function (inst) {
        return inst.badge && ~inst.badge.categories.indexOf(category);
      });
      return callback(null, valid);
    });
};

BadgeInstance.userHasBadge = function userHasBadge(user, shortname, callback) {
  const Badge = require('./badge');
  Badge.findOne({shortname: shortname}, function (err, badge) {
    if (err) return callback(err);
    if (!badge) return callback(null, false);
    const query = { userBadgeKey: user + '.' + badge.id };
    BadgeInstance.findOne(query, { user: 1 }, function (err, instance) {
      if (err) return callback(err);
      return callback(null, !!instance);
    });
  });
};

BadgeInstance.prototype.makeAssertion = function makeAssertion(opts) {
  // expects a populated instance
  opts = opts || {};
  return {
    uid: this._id,
    recipient: {
      identity: util.sha256(this.user, ''),
      type: 'email',
      hashed: true,
    },
    badge: this.badge.absoluteUrl('json'),
    verify: {
      type: 'hosted',
      url: this.absoluteUrl('assertion')
    },
    issuedOn: this.issuedOnUnix()
  };
};

BadgeInstance.prototype.relativeUrl = function relativeUrl(field) {
  var formats = {
    assertion: '/badge/assertion/%s',
  };
  return util.format(formats[field], this._id);
};

BadgeInstance.prototype.absoluteUrl = function absoluteUrl(field) {
  return env.qualifyUrl(this.relativeUrl(field));
};

BadgeInstance.prototype.issuedOnUnix = function issuedOnUnix() {
  if (!this.issuedOn)
    return 0;
  return (this.issuedOn / 1000) | 0;
};

BadgeInstance.markAllAsSeen = function markAllAsSeen(email, callback) {
  var query = { user: email };
  var update = { seen: true };
  var options = { multi: true };
  BadgeInstance.update(query, update, options, callback);
};
BadgeInstance.markAllAsRead = BadgeInstance.markAllAsSeen;

BadgeInstance.deleteAllByUser = function deleteAllByUser(email, callback) {
  function remover(i, callback) { return i.remove(callback) }
  var query = { user: email };
  BadgeInstance.find(query, function (err, instances) {
    if (err) return callback(err);
    async.map(instances, remover, function (err) {
      if (err) return callback(err);
      return callback(null, instances);
    });
  });
};

module.exports = BadgeInstance;
