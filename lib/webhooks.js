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
    if (!IS_TESTING) logger.log('debug', 'FAKE WEBHOOK REQUEST: request post with opts', opts);
    callback(null, { statusCode: 200 },  { status: 'ok' });
  }};
} else if (!/^https?:\/\//.test(WEBHOOK_URL)) {
  throw new Error("OPENBADGER_NOTIFICATION_WEBHOOK value is invalid: " +
                  WEBHOOK_URL);
}

function getJWTToken(email) {
  var claims = {
    prn: email,
    exp: Date.now() + TOKEN_LIFETIME
  };
  return jwt.encode(claims, exports.jwtSecret);
}

exports.notifyOfReservedClaim = function notifyOfReservedClaim(email, claimCode, evidenceItems, callback, isTesting) {
  callback = callback || function(err){ if (err) logger.log('info', util.format('Failed to notify %s of claim code %s for email %s.  %s', exports.webhookUrl, claimCode, email, err)); };

  var params = {
    auth: getJWTToken(email),
    email: email,
    claimCode: claimCode,
    evidenceItems: evidenceItems,
    isTesting: !!isTesting
  };

  var opts = {
      url: exports.webhookUrl,
      json: params
  };

  exports.request.post(opts, function (err, response, body) {
    if (err)
      return callback(err);

    if (response.statusCode !== 200)
      return callback(body);

    return callback(null, body);
  });
};