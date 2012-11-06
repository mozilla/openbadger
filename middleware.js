var env = require('./lib/environment');
var util = require('./lib/util');
var logger = require('./lib/logger');
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

exports.noCache = function noCache(options) {
  options = options || {};
  var whitelist = parseWhitelist(options.whitelist);
  return function (req, res, next) {
    if (!isExempt(whitelist, req.url))
      res.header("Cache-Control", "no-cache");
    return next();
  };
};

/** Adapted from connect/lib/middleware/csrf.js */
exports.csrf = function csrf(options) {
  options = options || {}
  var whitelist = parseWhitelist(options.whitelist);

  function getToken(req) {
    return (req.body && req.body.csrf)
      || (req.query && req.query.csrf)
      || (req.headers['x-csrf-token']);
  }

  return function(req, res, next){
    var token, val, err;
    if (isExempt(whitelist, req.url))
      return next();

    // generate CSRF token
    token = req.session._csrf || (req.session._csrf = util.uid(24));

    // ignore these methods
    if ('GET' === req.method ||
        'HEAD' === req.method ||
        'OPTIONS' === req.method)
      return next();

    // determine value
    val = getToken(req);

    // check
    if (val !== token) {
      logger.warn(util.format('CSRF failure at %s', req.url));
      return res.send(403);
    }

    return next();
  }
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
