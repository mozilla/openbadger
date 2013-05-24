const _ = require('underscore');
const fs = require('fs');
const pathutil = require('path');
const async = require('async');
const env = require('../lib/environment');
const util = require('../lib/util');
const test = require('tap').test;

if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'travis') {
  console.log("you must set NODE_ENV to 'test' before running tests");
  console.log("make sure to also change any database names so you don't destroy data");
  process.exit(1);
}
module.exports = test;

test.clock = {
  start: function (name) {
    this.name = name;
    console.log('---------------------------------');
    console.log('starting ' + name);
    console.log('---------------------------------');
    this.startTime = Date.now();
  },
  stop: function () {
    console.log('---------------------------------');
    console.log(this.name + ': '+ (Date.now() - this.startTime));
    console.log('---------------------------------');
  }
}


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

test.asset = function asset(name) {
  return fs.readFileSync(pathutil.join(__dirname, 'assets', name));
}


test.applyFixtures = function applyFixtures(fixtures, carryOn) {
  const client = require('../models');
  client.db.dropDatabase(function (err) {
    if (err) throw err;
    async.map(_.values(fixtures), util.method('save'), function (err, results) {
      if (err) throw err;
      carryOn(fixtures);
    });
  });
};
