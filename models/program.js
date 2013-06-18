const db = require('./');
const Deletable = require('./deletable');
const Schema = require('mongoose').Schema;
const env = require('../lib/environment');
const util = require('../lib/util');
const async = require('async');
const Badge = require('./badge');

const regex = {
  email: /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/i
};

const ProgramSchema = new Schema({
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
    unique: true
  },
  issuer: {
    type: String,
    ref: 'Issuer',
  },
  url: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  contact: {
    type: String,
    trim: true,
    match: regex.email
  },
  deleted: {type: Boolean, default: false},
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  phone: {
    type: String,
    trim: true,
  },
  image: {
    type: Buffer,
  }
});

const Program = Deletable(db.model('Program', ProgramSchema));
module.exports = Program;

// Validators & Defaulters
// -----------------------

function setShortNameDefault(next) {
  if (!this.shortname && this.name)
    this.shortname = util.slugify(this.name);
  next();
}
ProgramSchema.pre('validate', setShortNameDefault);

Program.prototype.makeJson = function makeIssuerJson() {
  // expects a populated instance
  const issuer = this.issuer;
  return {
    name: issuer.name,
    org: this.name,
    contact: this.contact || issuer.contact,
    url: this.url || issuer.url,
    description: this.description || issuer.description
  };
};
Program.prototype.relativeUrl = function relativeUrl(field) {
  const formats = {
    json: '/program/meta/%s',
    image: '/program/image/%s',
  };
  return util.format(formats[field], this._id);
};

Program.prototype.absoluteUrl = function absoluteUrl(field) {
  return env.qualifyUrl(this.relativeUrl(field));
};

Program.prototype.findBadges = function findBadges(callback) {
  Badge.find({ program: this.id }, callback);
};

Program.prototype.markAsDeleted = function markAsDeleted(callback) {
  var self = this;

  self.deleted = true;
  async.series([
    self.save.bind(self),
    Badge.update.bind(Badge, {program: self.id}, {deleted: true})
  ], callback);
};
