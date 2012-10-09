var env = require('../lib/environment');
var mongoose = require('mongoose');
var opts = env.get('mongo');

var connection = mongoose.createConnection(opts.host, opts.db, opts.port);
module.exports = connection;
