const _ = require('underscore');
const util = require('util');
const crypto = require('crypto');

util.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

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
 * Validate the length of a Mongoose field
 *
 * @param {String} field, {Int} length
 */
util.maxLength = function maxLength(field, length) {
  function lengthValidator() {
    if (!this[field]) return true;
    return this[field].length <= length;
  }
  const msg = 'maxLength';
  return [lengthValidator, msg];
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
 * Get a cryptographically strong random string.
 *
 * @param {Integer} length
 * @return {String} a random string
 */

util.strongRandomString = function strongRandomString(length, alphabet) {
  alphabet = alphabet || util.alphabet;
  var bytes = crypto.randomBytes(length);
  var index = bytes.length;
  var result = [];
  var letter;
  while (index--) {
    letter = alphabet[bytes[index] % alphabet.length];
    result.push(letter);
  }
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

/** Jacked from connect/lib/utils.js */
util.uid = function uid(len) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')
    .slice(0, len);
};

util.method = function method(name) {
  const args = [].slice.call(arguments, 1);
  return function (o) {
    // handle async methods
    const theseArgs = args.slice(0);
    if (typeof arguments[1] === 'function')
      theseArgs.push(arguments[1]);
    return o[name].apply(o, theseArgs);
  };
};

util.prop = function prop(name) {
  if (arguments.length > 1)
    return util.deepProp.apply(null, arguments);
  return function (o) { return o[name] };
};

util.deepProp = function () {
  const args = [].slice.call(arguments);
  const last = args.pop();
  return function (o) {
    return args.reduce(function (obj, name) {
      return (obj[name] || {});
    }, o)[last];
  };
};

util.objWrap = function objWrap(prop) {
  return function (val) {
    const obj = {};
    return (obj[prop] = val, obj);
  };
};


const whitelistProto = {
  exempt: function exempt(value) {
    return this.list.some(function (re) {
      return re.test(value);
    });
  }
};
util.whitelist = function whitelist(list) {
  return Object.create(whitelistProto, {
    list: {
      value: (list||[]).map(function (e) {
        if (typeof e != 'string')
          return e;
        e = e.replace('*', '.*?');
        return RegExp('^' + e + '$');
      })
    }
  });
};

util.pager = function (array, opts) {
  opts = _.defaults(opts, { page: 1, count: 10, });
  const page = opts.page;
  const count = opts.count;
  const begin = (page - 1) * count;
  const end = page * count;
  return array.slice(begin, end);
};

const reEmail = /[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+(?:\.[a-z0-9!#$%&'*+\/=?\^_`{|}~\-]+)*@(?:[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?/i;
util.isEmail = function isEmail(email) {
  return reEmail.test(email);
};


util.negate = function negate(fn) {
  return function () {
    const args = [].slice.call(arguments);
    const cb = args.pop();
    args.push(function (err, result) {
      if (err) return cb(err);
      return cb(null, !result);
    });
    fn.apply(null, args);
  };
};

util.empty = function empty(thing) {
  if (!thing)
    return true;
  if (Array.isArray(thing) ||
      typeof thing == 'string' ||
      Buffer.isBuffer(thing))
    return !thing.length;
  if (typeof thing == 'object')
    return !Object.keys(thing).length;
  return !thing;
};

util.makeSearch = function (fields) {
  const prop = util.prop;
  return function searchFn(regex) {
    if (typeof regex === 'string')
      regex = new RegExp(regex, 'i');
    return function filter(item) {
      return fields.reduce(function (res, field) {
        const value = prop.apply(null, field.split('.'))(item);
        return res || regex.test(value);
      }, false);
    };
  };
};

module.exports = util;
