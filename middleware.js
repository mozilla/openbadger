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
  return express.session({
    key: 'openbadger.sid',
    store: new RedisStore(env.get('redis')),
    secret: env.get('secret'),
  });
};
