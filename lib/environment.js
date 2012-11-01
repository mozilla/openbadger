var habitat = require('habitat');
var env = new habitat('openbadger');
var urlutil = require('url');

// In here we hack the environment variables that habitat uses based on
// VCAP_SERVICES provided by CloudFoundry
require('./cloudfoundry-env');

/**
 * Qualify a url with the protocol, host and port from the env
 *
 * @param {String} path
 * @return {String} qualified url
 */

env.qualifyUrl = function qualifyUrl(path) {
  var urlopts = {
    hostname: env.get('host'),
    protocol: env.get('protocol'),
    port: env.get('port'),
    pathname: path
  }
  return urlutil.format(urlopts);
};

/**
 * Get the full origin from protocol, host and port env params
 *
 * @return {String} origin
 */

env.origin = function origin() {
  return env.qualifyUrl('');
};

module.exports = env;
