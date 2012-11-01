var env = require('../lib/environment');
var mongoose = require('mongoose');
var opts = env.get('mongo');

var authOpts = {};

if (opts.pass){
  authOpts.pass = opts.pass;
}

if (opts.user){
  authOpts.user = opts.user;
}
var connection = mongoose.createConnection(opts.host, opts.db, opts.port, authOpts);

module.exports = connection;
