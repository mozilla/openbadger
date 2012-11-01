var env = require('./lib/environment');
var util = require('./lib/util');
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
  var whitelist = parseWhitelist(options.whitelist);
  return function (req, res, next) {
    if (isExempt(whitelist, req.url))
      res.header("Access-Control-Allow-Origin", "*");
    return next();
  };
};

function isExempt(whitelist, path) {
  var i = whitelist.length;
  while (i--) {
    if (whitelist[i].test(path))
      return true;
  }
  return false;
}

function parseWhitelist(array) {
  if (!array)
    return [];
  return array.map(function (entry) {
    if (typeof entry === 'string') {
      entry = entry.replace('*', '.*?');
      return RegExp('^' + entry + '$');
    }
    return entry;
  });
}

exports.flash = flash;
