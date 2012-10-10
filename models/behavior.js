var db = require('./');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var util = require('../lib/util');

var BehaviorSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  shortname: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
});

function setShortNameDefault(next) {
  if (!this.shortname && this.name)
    this.shortname = util.slugify(this.name);
  next();
}
BehaviorSchema.pre('validate', setShortNameDefault);

var Behavior = db.model('Behavior', BehaviorSchema);
module.exports = Behavior;