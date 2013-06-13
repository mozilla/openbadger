const env = require('../lib/environment');
const crypto = require('crypto');
const mongoose = require('mongoose');
const opts = env.get('mongo');
const util = require('../lib/util');

const authOpts = {};

if (!opts)
  throw new Error("mongodb environment variables not found");

if (opts.pass){
  authOpts.pass = opts.pass;
}
if (opts.user){
  authOpts.user = opts.user;
}
const connection = module.exports = Object.create(
  mongoose.createConnection(opts.host, opts.db, opts.port, authOpts)
);
connection.generateId = generateId;
connection.healthCheck = function(meta, cb) {
  var Issuer = require('./issuer');
  Issuer.findOne({}, cb);
};

function sha1(input) {
  return crypto.createHash('sha1').update(input).digest('hex');
}
function generateId() {
  return sha1('' + Date.now() + util.randomString(16));
}
