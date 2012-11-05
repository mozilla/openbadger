var test = require('tap').test;
var Set = require('../lib/set');

test('set constructor', function (t) {
  var s = new Set([1, 2, 3, 4, 5, 5, 5, 5]);
  var expect = [1, 2, 3, 4, 5];
  var result = s.values();
  t.same(result, expect);
  t.end();
});

test('set constructor: complex things', function (t) {
  var s = new Set(['hey', 'sup', 0, false, null, { lol: 'wut' }, { lol: 'wut' }]);
  var expect = ['hey', 'sup', 0, false, null, { lol: 'wut' }].sort();
  t.same(s.values().sort(), expect);
  t.end();
});


test('set#add', function (t) {
  var s = new Set(['hey', 'sup']);
  var expect, result;
  t.same(s.add('lol'), true, 'should add');
  t.same(s.add('lol'), false, 'should not add');
  expect = ['hey', 'sup', 'lol'];
  result = s.values();
  t.same(result, expect);
  t.end();
});

test('set#has', function (t) {
  var s = new Set([0, false, null, undefined, { some: 'thing' }]);
  t.ok(s.has(0), 'should have 0');
  t.ok(s.has(false), 'should have false');
  t.ok(s.has(null), 'should have null');
  t.ok(s.has(undefined), 'should have undefined');
  t.ok(s.has({ some: 'thing' }), 'should have {"some": "thing"}');
  t.notOk(s.has({ some: 'thingd' }), 'should not have');
  t.end();
});

test('set#remove', function (t) {
  var s = new Set(['hey', 'sup']);
  var expect = ['sup']
  var result;
  t.same(s.remove('hey'), true, 'should remove');
  t.same(s.remove('hey'), false, 'should do nothing');
  t.same(s.values(), expect);
  t.end();
});

test('set#union', function (t) {
  var s1 = new Set(['hello']);
  var s2 = new Set(['world']);
  var expect = ['hello', 'world'].sort()
  var result = s1.union(s2).values().sort();
  t.same(result, expect);
  t.end();
});

test('set#intersection', function (t) {
  var s1 = new Set([1, 2, 3, 4]);
  var s2 = new Set([3, 4, 5, 6]);
  var result = s1.intersection(s2).values().sort();
  var expect = [3, 4];
  t.same(result, expect);
  t.end();
});
