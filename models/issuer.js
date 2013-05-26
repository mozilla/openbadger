const db = require('./');
const crypto = require('crypto');
const mongoose = require('mongoose');
const env = require('../lib/environment');
const util = require('../lib/util');
const Schema = mongoose.Schema;

const DEFAULT_SECRET_LENGTH = 64;
const NAME_MAX_LENGTH = 128;
const ORG_MAX_LENGTH = 128;

const regex = {
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/i
};

const AccessUser = new Schema({
  email: {
    type: String,
    trim: true,
    required: true,
    match: regex.email
  },
});

const IssuerSchema = new Schema({
  _id: {
    type: String,
    unique: true,
    required: true,
    default: db.generateId,
  },
  name: {
    type: String,
    trim: true,
    required: true,
  },
  shortname: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },
  contact: {
    type: String,
    trim: true,
    required: true,
    match: regex.email
  },
  url: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  image: {
    type: Buffer,
  },
  accessList: [AccessUser],
  programs: [{ type: String, ref: 'Program' }]
});

const Issuer = db.model('Issuer', IssuerSchema);

IssuerSchema.pre('validate', function defaultShortname(next) {
  if (this.shortname) return next();
  this.shortname = util.slugify(this.name);
  return next();
});

Issuer.findByAccess = function findByAccess(email, callback) {
  const query = {accessList: {'$elemMatch': {email: email }}};
  return Issuer.find(query, callback);
};

Issuer.prototype.hasAccess = function hasAccess(email) {
  return this.accessList.some(function (acl) {
    return acl.email === email;
  });
};

Issuer.prototype.addAccess = function addAccess(emails) {
  if (arguments.length > 1)
    return this.addAccess([].slice.call(arguments));
  if (typeof emails === 'string')
    return this.addAccess([emails]);

  emails = emails.filter(function (email) {
    return !this.hasAccess(email);
  }.bind(this));

  if (emails.length == 0)
    return false;

  emails.forEach(function (email) {
    this.accessList.push({email: email});
  }.bind(this));

  return true;
};

Issuer.prototype.removeAccess = function removeAccess(email) {
  const oldList = this.accessList;
  const newList = oldList.filter(function (acl) {
    return acl.email !== email;
  });
  if (newList.length === oldList.length)
    return false;
  this.accessList = newList;
  return true;
};

// TODO: change this to work with the fact that we now have the concept
// of multiple issuers & multiple organizations for each issuer.
Issuer.getAssertionObject = function getAssertionObject(callback) {
  Issuer.findOne(function (err, issuer) {
    if (err)
      return callback(err);
    if (!issuer)
      return callback(new Error('no issuer in database'));
    var result = {};
    result.name = issuer.name;
    result.contact = issuer.contact;
    if (issuer.org)
      result.org = issuer.org;
    result.origin = env.origin();
    return callback(null, result);
  });
};

Issuer.prototype.relativeUrl = function relativeUrl(field) {
  const formats = {
    image: '/issuer/image/%s',
  };
  return util.format(formats[field], this._id);
};

Issuer.prototype.absoluteUrl = function absoluteUrl(field) {
  return env.qualifyUrl(this.relativeUrl(field));
};

module.exports = Issuer;
