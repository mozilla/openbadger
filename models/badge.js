var db = require('./');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var util = require('../lib/util');

function maxLength(field, length) {
  function lengthValidator() {
    if (!this[field]) return true;
    return this[field].length <= length;
  }
  var msg = 'maxLength';
  return [lengthValidator, msg];
}

var BehaviorSchema = new Schema({
  shortname: {
    type: String,
    trim: true,
    required: true
  },
  count: {
    type: Number,
    min: 0,
    required: true
  }
});

var BadgeSchema = new Schema({
  shortname: {
    type: String,
    trim: true,
    required: true,
    unique: true
  },
  name: {
    type: String,
    trim: true,
    required: true,
    unique: true,
    validate: maxLength('name', 128)
  },
  description: {
    type: String,
    trim: true,
    required: true,
    validate: maxLength('description', 128)
  },
  criteria: {
    content: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    }
  },
  behaviors: {
    type: [BehaviorSchema],
    unique: true
  },
  prerequisites: {
    type: [String]
  },
  image: {
    type: Buffer,
    required: true,
    validate: maxLength('image', 256 * 1024)
  }
});

var Badge = db.model('Badge', BadgeSchema);

function setShortnameDefault(next) {
  if (!this.shortname && this.name)
    this.shortname = util.slugify(this.name);
  next();
}
BadgeSchema.pre('validate', setShortnameDefault);

Badge.findByBehavior = function findByBehavior(shortname, callback) {
  var searchTerms = { behaviors: { '$elemMatch': { shortname: shortname }}};
  return Badge.find(searchTerms, callback);
};

Badge.prototype.removeBehavior = function removeBehavior(shortname) {
  var behaviors = this.behaviors.filter(function (behavior) {
    if (behavior.shortname === shortname)
      return null;
    return behavior;
  });
  this.behaviors = behaviors;
  return this;
};

Badge.prototype.imageDataURI = function imageDataURI() {
  // #TODO: don't hardcode PNG maybe
  var base64 = '';
  var format = 'data:image/png;base64,%s';
  if (this.image)
    base64 = this.image.toString('base64');
  return util.format('data:image/png;base64,%s', base64);
};

module.exports = Badge;
