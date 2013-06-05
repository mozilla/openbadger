const env = require('./environment');
const url = require('url');
const jwt = require('jwt-simple');
const request = require('request');

const JWT_SECRET = env.get('JWT_SECRET');
const WEBHOOK_URL = env.get('NOTIFICATION_WEBHOOK');
const TOKEN_LIFETIME = process.env['WEBHOOK_TOKEN_LIFETIME'] || 10000;

if (!JWT_SECRET)
  throw new Error('Must specify OPENBADGER_JWT_SECRET in the environment');

if (!WEBHOOK_URL)
  throw new Error('Must specify OPENBADGER_NOTIFICATION_WEBHOOK in the environment');


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
      url: url.resolve(WEBHOOK_URL, '/notify/claim'),
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