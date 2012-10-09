var db = require('./');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var BehaviorSchema = new Schema({
  name: String,
  description: String
});

var Behavior = db.model('Behavior', BehaviorSchema);
module.exports = Behavior;