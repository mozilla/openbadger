// newrelic.js
var NEWRELIC_LICENSE = process.env('NEWRELIC_LICENSE');
var NEWRELIC_APPNAME = process.env('NEWRELIC_APPNAME');

exports.config = {
  app_name: [ NEWRELIC_APPNAME ],
  license_key: NEWRELIC_LICENSE,
  logging: {
    filepath: 'stdout'
  }
};
