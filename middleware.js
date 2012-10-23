var env = require('./lib/environment');
var express = require('express');
var RedisStore = require('connect-redis')(express);
var flash = require('connect-flash');

exports.cookieParser = function () {
  var secret = env.get('secret');
  return express.cookieParser(secret);
};

/**
 * Store sessions in redis
 */
exports.session = function () {
  var options = env.get('redis');
  options.db = env.get('redis_session_db');
  return express.session({
    key: 'openbadger.sid',
    store: new RedisStore(options),
    secret: env.get('secret'),
  });
};

exports.cors = function cors(options) {
  options = options || {};
  var list = options.whitelist || [];
  if (typeof list === 'string') list = [list];
  return function (req, res, next) {
    if (!whitelisted(list, req.url)) return next();
    res.header("Access-Control-Allow-Origin", "*");
    return next();
  };
};

function whitelisted(list, input) {
  var pattern;
  for (var i = list.length; i--;) {
    pattern = list[i];
    if (RegExp('^' + list[i] + '$').test(input)) return true;
  }
  return false;
}

exports.flash = flash;
