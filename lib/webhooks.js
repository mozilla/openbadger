const env = require('./environment');
const url = require('url');
const jwt = require('jwt-simple');
const logger = require('./logger.js');
const util = require('./util.js');

var JWT_SECRET = env.get('JWT_SECRET');
const WEBHOOK_URL = env.get('NOTIFICATION_WEBHOOK');
const TOKEN_LIFETIME = process.env['WEBHOOK_TOKEN_LIFETIME'] || 10000;

const IS_TESTING = (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'travis');
const FAKE_WEBHOOK = IS_TESTING || (process.env.NODE_ENV === 'development' && !WEBHOOK_URL);

// Exporting these is primarily intended for test suites to stub/override.
exports.request = require('request');
exports.webhookUrl = WEBHOOK_URL;
exports.jwtSecret = JWT_SECRET;

if (FAKE_WEBHOOK) {
  exports.jwtSecret = 'asecrettoeveryone';
  exports.request = { post: function(opts, callback) {
    if (!IS_TESTING) logger.debug({opts: opts}, 'FAKE WEBHOOK REQUEST: request post with opts');
    callback(null, { statusCode: 200 },  { status: 'ok' });
  }};
} else if (!/^https?:\/\//.test(WEBHOOK_URL)) {
  throw new Error("OPENBADGER_NOTIFICATION_WEBHOOK value is invalid: " +
                  WEBHOOK_URL);
} else if (WEBHOOK_URL.indexOf('/claim') !== -1) {
  // we may want to remove this warning after a while when it becomes less likely for people to still be using the old value
  console.log('OPENBADGER_NOTIFICATION_WEBHOOK value includes /claim in the path, which may no longer be valid.  Try removing /claim from the end of the path if you encounter problems.');
}

function getJWTToken(email) {
  var claims = {
    prn: email,
    exp: Date.now() + TOKEN_LIFETIME
  };
  return jwt.encode(claims, exports.jwtSecret);
}

function sendRequest(opts, callback) {
  exports.request.post(opts, function (err, response, body) {
    if (err)
      return callback(err);

    if (response.statusCode !== 200)
      return callback(body);

    return callback(null, body);
  });
}


exports.notifyOfReservedClaim = function notifyOfReservedClaim(email, claimCode, evidenceItems, callback, isTesting) {
  callback = callback || function(err){ if (err) logger.info(util.format('Failed to notify %s of claim code %s for email %s.  %s', exports.webhookUrl, claimCode, email, err)); };

  var params = {
    auth: getJWTToken(email),
    email: email,
    claimCode: claimCode,
    evidenceItems: evidenceItems,
    isTesting: !!isTesting
  };

  var opts = {
      url: url.resolve(exports.webhookUrl, 'claim'),
      json: params
  };

  sendRequest(opts, callback);
};

exports.notifyOfAwardedBadge = function notifyOfAwardedBadge(email, badgeShortname, callback, isTesting) {
  callback = callback || function(err){ if (err) logger.info(util.format('Failed to notify %s of awarded badge %s for email %s.  %s', exports.webhookUrl, badgeShortname, email, err)); };

  var params = {
    auth: getJWTToken(email),
    email: email,
    badgeShortname: badgeShortname,
    isTesting: !!isTesting
  };

  var opts = {
    url: url.resolve(exports.webhookUrl, 'award'),
    json: params
  };

  sendRequest(opts, callback);
};

exports.healthCheck = function(meta, callback) {
  var async = require('async');

  async.series([
    function(cb) {
      exports.notifyOfReservedClaim('test@testmail.com', 'abcd-efgh-ijkl-mnop', null, function(err, body) {
        if (err) {
          cb('Test of reserved claim notification endpoint failed');
        }
        cb();
      }, true);
    },
    function(cb) {
      exports.notifyOfAwardedBadge('test@testmail.com', 'test-badge', function(err, body) {
        if (err) {
          cb('Test of badge award notification endpoint failed');
        }
        cb();
      }, true);
    }
  ], callback);
};