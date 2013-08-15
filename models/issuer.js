const db = require('./');
const crypto = require('crypto');
const async = require('async');
const mongoose = require('mongoose');
const env = require('../lib/environment');
const util = require('../lib/util');
const Deletable = require('./deletable');
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
    match: regex.email
  },
  url: {
    type: String,
    trim: true,
  },
  deleted: {type: Boolean, default: false},
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

const Issuer = Deletable(db.model('Issuer', IssuerSchema));

IssuerSchema.pre('validate', function defaultShortname(next) {
  if (this.shortname) return next();
  this.shortname = util.slugify(this.name);
  return next();
});

Issuer.findByAccess = function findByAccess(email, callback) {
  if (env.isAdmin(email)) {
    return Issuer.find({}, callback);
  }

  const query = {accessList: {'$elemMatch': {email: email }}};
  return Issuer.find(query, callback);
};

Issuer.prototype.hasAccess = function hasAccess(email) {
  return env.isAdmin(email) || this.accessList.some(function (acl) {
    return acl.email === email;
  });
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

Issuer.prototype.getDeletableChildren = function getDeletableChildren(cb) {
  var self = this;
  this.populate('programs', function(err) {
    cb(err, self.programs);
  });
};

Issuer.prototype.removeProgram = function removeProgram(programToRemove, callback) {
  const needle = typeof programToRemove == 'string'
    ? programToRemove
    : programToRemove.id;
  this.programs = this.programs.filter(function (program) {
    return (typeof program == 'string'
            ? needle !== program
            : needle !== program.id);
  });
  this.save(callback);
};

module.exports = Issuer;
