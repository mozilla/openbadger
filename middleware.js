var env = require('./lib/environment');
var express = require('express');
var RedisStore = require('connect-redis')(express);

exports.cookieParser = function () {
  var secret = env.get('secret');
  return express.cookieParser(secret);
};

/**
 * Store sessions in redis
 */
exports.session = function () {
  var options = env.get('redis');
  options.db = 1;
  return express.session({
    key: 'openbadger.sid',
    store: new RedisStore(options),
    secret: env.get('secret'),
  });
};
