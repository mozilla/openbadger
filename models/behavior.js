var env = require('../lib/environment');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var opts = env.get('mongo');
var db = mongoose.createConnection(opts.host, opts.db, opts.port);

var behaviorSchema = new mongoose.Schema({
  name: String,
  description: String
});

var Behavior = db.model('Behavior', behaviorSchema);
module.exports = Behavior;