var env = require('./environment');
var util = require('util');
var https = require('https');
var urlutil = require('url');
var _ = require('underscore');

var VERIFIER_REQUEST_OPTS = {
  host: 'verifier.login.persona.org',
  path: '/verify',
  port: 443,
  method: 'POST'
};

function getAudience(subdomain) {
  return env.get('origin');
}

function makeRequestOptions(postData) {
  var opts = _.extend({
    headers : {
      'Content-Length': postData.length,
      'Content-Type': 'application/json',
      'User-Agent': 'OpenBadger Backend'
    }
  }, VERIFIER_REQUEST_OPTS);
  return opts;
}

exports.verify = function verify(assertion, subdomain, callback) {
  if (typeof subdomain == 'function') {
    callback = subdomain;
    subdomain = null;
  }

  var audience = getAudience(subdomain);
  var postData = JSON.stringify({
    assertion: assertion,
    audience: audience
  });

  var options = makeRequestOptions(postData);
  https.request(options, function (res) {
    var err;
    var body = Buffer(0);
    res.on('data', function (buf) { body = Buffer.concat([body, buf]); });
    res.on('end', function () {
      var response = JSON.parse(body.toString());
      if (response.status !== 'okay') {
        err = new Error(response.reason);
        return callback(err);
      }
      if (!response.email) {
        err = new Error('could not get email from supposedly okay response');
        return callback(err);
      }
      return callback(null, response.email);
    });
  }).on('error', function (err) {
    return callback(err);
  }).end(postData);
};