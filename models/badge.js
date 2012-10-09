var db = require('./');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var maxLength = function (field, length) {
  function lengthValidator() {
    if (!this[field]) return true;
    return this[field].length <= length;
  }
  var msg = 'maxLength';
  return [lengthValidator, msg];
}

var BehaviorSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true
  },
  required: {
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
  },
  prerequisites: {
    type: [String]
  }
});

var Badge = db.model('Badge', BadgeSchema);

Badge.findByBehavior = function findByBehavior(name, callback) {
  var searchTerms = {behaviors: { '$elemMatch': {name: name }}};
  return Badge.find(searchTerms, callback);
};

module.exports = Badge;
