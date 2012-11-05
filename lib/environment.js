var habitat = require('habitat');
var env = new habitat('openbadger');
var urlutil = require('url');

// In here we hack the environment variables that habitat uses based on
// VCAP_SERVICES provided by CloudFoundry
require('./cloudfoundry-env');

// just in case the old name of `persona_audience` is still being used
env.set('origin', env.get('origin', env.get('persona_audience')));

/**
 * Qualify a url with the protocol, host and port from the env
 *
 * @param {String} path
 * @return {String} qualified url
 */

env.qualifyUrl = function qualifyUrl(path) {
  var opts = urlutil.parse(env.get('origin'));
  opts.pathname = path;
  return urlutil.format(opts);
};

env.origin = function origin() {
  return env.get('origin');
};


module.exports = env;