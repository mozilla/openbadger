var async = require('async');
var env = require('../lib/environment');
var test = require('tap').test;

module.exports = test;

/**
 * Generate a random string of specified length.
 *
 * @param {Integer} length
 * @return {String} Random string with `length` characters
 */

test.randomstring = function randomstring(length) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890-=<>?,./{}|[]\\!@#$%^&*()_+';
  var str = '';
  while (length--)
    str += chars[Math.random() * chars.length | 0];
  return str;
};

test.applyFixtures = function applyFixtures(fixtures, carryOn) {
  /**
   * Get an array of values from an object.
   */
  function values(obj) {
    return Object.keys(obj).map(function (key) { return obj[key] });
  }

  /**
   * Figure out all of the different models represented by fixtures
   */
  function models(fixtures) {
    return values(fixtures).reduce(function (arr, obj) {
      var model = obj.constructor;
      if (arr.indexOf(model) === -1)
        arr.push(model);
      return arr;
    }, []);
  }

  /**
   * Remove all entries from a collection
   */
  function flush(Model, callback) {
    function destroyer(thing, callback) {
      return thing.remove(callback);
    }
    Model.find({}, function (err, results) {
      async.map(results, destroyer, function (err, results) {
        if (err) throw err;
        callback(null, results);
      });
    });
  }

  /**
   * Flush all of the models for each of the fixtures.
   */
  function flushAll(callback) {
    async.map(models(fixtures), flush, function (err, results) {
      if (err) throw err;
      callback(results);
    })
  }

  /**
   * Save all of the fixtures.
   */
  function saveAll(callback) {
    function saver(thing, callback) {
      return thing.save(callback);
    }
    async.map(values(fixtures), saver, function (err, results) {
      if (err) throw err;
      callback(null, results)
    });
  }

  flushAll(function () {
    saveAll(function () {
      carryOn(fixtures);
    });
  });
};