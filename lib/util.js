var util = require('util');
var crypto = require('crypto');

util.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890-_';

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
 * Alias for `crypto.createHash(algo).update(str).digest('hex');
 *
 * @param {String} string
 * @param {String} algorithm
 * @return {String} hash
 */
util.hash = function hash(string, algorithm) {
  var sum = crypto.createHash(algorithm || 'sha256');
  return sum.update(string).digest('hex');
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
  sum.update(string);
  if (salt)
    sum.update(salt);
  return util.format('sha256$%s', sum.digest('hex'));
};

/**
 * Get a random integer between 0 and `max`.
 * Not cryptographically strong.
 *
 * @param {Integer} max
 * @return {Integer} random integer
 */

util.randomInt = function randomInt(max) {
  return Math.random() * max | 0;
};

/**
 * Get a random character.
 * Not cryptographically strong.
 *
 * @param {String|Array} charset
 * @return {String} a random character
 */

util.randomChar = function randomChar(charset) {
  var chars = charset || util.alphabet;
  var index = util.randomInt(chars.length);
  return chars[index];
};

/**
 * Get a random string.
 * Not crypographically strong.
 *
 * @param {Integer} length
 * @return {String} a random string
 */

util.randomString = function randomstring(length) {
  var result = [];
  while (length--)
    result.push(util.randomChar());
  return result.join('');
};

/**
 * Array to map
 *
 * @param {Array} array
 * @param {String} key The key to use in the map
 */
util.toMap = function toMap(array, key) {
  return array.reduce(function (o, thing) {
    o[thing[key]] = thing;
    return o;
  }, {});
};

module.exports = util;

