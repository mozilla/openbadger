const _ = require('underscore');
const habitat = require('habitat');
const env = new habitat('openbadger');
const urlutil = require('url');

// In here we hack the environment variables that habitat uses based on
// VCAP_SERVICES provided by CloudFoundry
require('./cloudfoundry-env');

// just in case the old name of `persona_audience` is still being used
env.set('origin', env.get('origin', env.get('persona_audience')));

env.qualifyUrl = function qualifyUrl(path) {
  const pathParts = urlutil.parse(path);
  const urlParts = urlutil.parse(env.get('origin'));
  return urlutil.format(_.defaults(pathParts, urlParts));
};

env.origin = function origin() {
  return env.get('origin');
};

env.isAdmin = function isAdmin(email) {
  const admins = env.get('admins');
  return admins.some(function (admin) {
    return new RegExp(admin.replace('*', '.+?')).test(email);
  });
};

env.isHttps = function isHttps() {
  return /^https/.test(env.get('origin'));
};

module.exports = env;
