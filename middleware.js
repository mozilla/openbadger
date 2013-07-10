const _ = require('underscore');
const env = require('./lib/environment');
const util = require('./lib/util');
const log = require('./lib/logger');
const express = require('express');
const flash = require('connect-flash');

exports.cookieParser = function () {
  var secret = env.get('secret');
  return express.cookieParser(secret);
};

exports.logger = function () {
  return function (req, res, next) {
    const startTime = new Date();
    log.info({
      req: req
    }, util.format(
      'Incoming Request: %s %s',
      req.method, req.url));

    // this method of hijacking res.end is inspired by connect.logger()
    // see connect/lib/middleware/logger.js for details.
    const end = res.end;
    res.end = function(chunk, encoding){
      const responseTime = new Date() - startTime;
      res.end = end;
      res.end(chunk, encoding);
      log.info({
        url: req.url,
        responseTime: responseTime,
        res: res,
      }, util.format(
        'Outgoing Response: HTTP %s %s (%s ms)',
        res.statusCode, req.url, responseTime));
    };
    return next();
  };
};


exports.noFrame = function noFrame() {
  return function (req, res, next) {
    res.setHeader('X-Frame-Options', 'DENY');
    return next();
  };
};

exports.strictTransport = function strictTransport() {

  function setStrictTransport(req, res, next) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    return next();
  }

  function doNothing(_, _, next) {
    return next();
  }

  return env.isHttps() ? setStrictTransport : doNothing;
};

exports.getSessionStore = function getSessionStore(env) {
  const redisOpts = env.get('redis');
  const memcachedOpts = env.get('memcached');
  if (memcachedOpts) {
    const MemcachedStore = require('connect-memcached')(express);
    return new MemcachedStore(memcachedOpts);
  }
  const RedisStore = require('connect-redis')(express);
  redisOpts.db = env.get('redis_session_db');
  var store = new RedisStore(redisOpts);
  store.client.on('error', function(err) {
    console.error("REDIS ERROR", err);
  });
  return store;
};

exports.session = function (sessionStore) {
  return express.session({
    key: 'openbadger.sid',
    store: sessionStore,
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

function makeGetFlashMessages(req) {
  var cached = null;

  return function() {
    if (!cached) {
      cached = [];
      ['error', 'success', 'info'].forEach(function(category) {
        req.flash(category).forEach(function(info) {
          cached.push(_.extend({category: category}, info));
        });
      });
    }
    return cached;
  };
};

exports.flash = function flashWithMessages() {
  var flashMiddleware = flash();

  return function(req, res, next) {
    res.locals.messages = makeGetFlashMessages(req);
    return flashMiddleware(req, res, next);
  };
};
