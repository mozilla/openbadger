var util = require('util');
var crypto = require('crypto');

/**
 * Slugify a string
 *
 * @param {String} string
 */

util.slugify = function slugify(string) {
  return string
    .toLowerCase()
    .replace(/[\s\-]+/g, '-')
    .replace(/[^a-z0-9_\-]/gi, '');
};

/**
 * Generate a descriptive sha256 hash with optional salt.
 *
 * @param {String} string
 * @param {String} salt
 * @return {String} sha256 hash
 */

util.sha256 = function sha256(string, salt) {
  var sum = crypto.createHash('sha256');
  sum.update(str);
  if (salt)
    sum.update(salt);
  return util.format('sha256$%s', sum.digest('hex'));
};
module.exports = util;

