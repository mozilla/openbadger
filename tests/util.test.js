const test = require('./');
const util = require('../lib/util');
const async = require('async');

test('util.slugify', function (t) {
  var input = 'RaD    to the Max';
  var expect = 'rad-to-the-max';
  var result = util.slugify(input);
  t.same(result, expect);
  t.end();
});

test('util.sha256', function (t) {
  var crypto = require('crypto');
  var sum = crypto.createHash('sha256');
  var expect = 'sha256$' + sum.update('awesomerad').digest('hex');
  var result = util.sha256('awesome', 'rad');
  t.same(result, expect);
  t.end();
});

test('util.randomInt', function (t) {
  var times = 10000;
  var max = 10;
  while (times--) {
    var integer = util.randomInt(max);
    if (integer >= max || integer < 0) {
      t.fail('integer should not be outside bounds');
      break;
    }
  }
  t.pass('no failures');
  t.end();
});

test('util.randomString', function (t) {
  var string = util.randomString(128);
  t.same(string.length, 128, 'should have the right length');
  t.end();
});

test('util.strongRandomString', function (t) {
  var string = util.strongRandomString(128);
  t.same(string.length, 128, 'should have the right length');
  t.end();
});

test('util.toMap', function (t) {
  var array = [{name: 'ya', value: true}, {name: 'nope', value: false}];
  var obj = util.toMap(array, 'name');
  t.same(obj.ya.value, true);
  t.same(obj.nope.value, false);
  t.end();
});

test('util.pager', function (t) {
  var array = [0,1,2,3,4,5,6,7,8,9];
  t.same(util.pager(array, {page: 2, count: 3}), [3,4,5]);
  t.same(util.pager(array, {page: 4, count: 1}), [3]);
  t.same(util.pager(array, {page: 1, count: 100}), array);
  t.same(util.pager(array, {count: 5}), [0,1,2,3,4]);
  t.end();
});

test('util.method, async', function (t) {
  const result = ['% bananas', '% apples', '% bears']
    .map(util.method('replace', /%/g, 'ten'));
  t.same(result, ['ten bananas', 'ten apples', 'ten bears']);
  t.end();
});

test('util.method, async', function (t) {
  const Thing = function (value) { this.name = value };
  Thing.prototype.echo = function (callback) {
    return callback(null, this.name);
  };
  const x = new Thing('one');
  const y = new Thing('two');
  const z = new Thing('three');

  async.map([z, y, x], util.method('echo'), function (err, results) {
    t.same(results, ['three', 'two', 'one']);
    t.end();
  });

});

test('util.whitelist', function (t) {
  const list = util.whitelist([
    'A',
    'B',
    'C',
    '*D'
  ]);
  t.same(list.exempt('x'), false);
  t.same(list.exempt('A'), true);
  t.same(list.exempt('A1'), false);
  t.same(list.exempt('AaaaaaaD'), true);
  t.end();
});
