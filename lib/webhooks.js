const env = require('./environment');
const url = require('url');
const jwt = require('jwt-simple');
const logger = require('./logger.js');
var request = require('request');

var JWT_SECRET = env.get('JWT_SECRET');
const WEBHOOK_URL = env.get('NOTIFICATION_WEBHOOK');
const TOKEN_LIFETIME = process.env['WEBHOOK_TOKEN_LIFETIME'] || 10000;

const FAKE_WEBHOOK = (process.env.NODE_ENV === 'test')
  || (process.env.NODE_ENV === 'travis')
  || (process.env.NODE_ENV === 'development' && !WEBHOOK_URL);

if (FAKE_WEBHOOK) {
  JWT_SECRET = 'asecrettoeveryone';
  request = { post: function(opts, callback) {
    logger.log('debug', 'FAKE WEBHOOK REQUEST: request post with opts', opts);
    callback(null, { statusCode: 200 },  { status: 'ok' });
  }};
}

function getJWTToken(email) {
  var claims = {
    prn: email,
    exp: Date.now() + TOKEN_LIFETIME
  };
  return jwt.encode(claims, JWT_SECRET);
}

exports.notifyOfReservedClaim = function notifyOfReservedClaim(email, claimCode, callback) {
  var params = {
    auth: getJWTToken(email),
    email: email,
    claimCode: claimCode
  };

  var opts = {
      url: WEBHOOK_URL,
      json: params
  };

  request.post(opts, function (err, response, body) {
    if (err)
      return callback(err);

    if (response.statusCode !== 200)
      return callback(body);

    return callback(null, body);
  });
};