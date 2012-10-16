var test = require('./');
var db = require('../models');
var BadgeInstance = require('../models/badge-instance');
var Badge = require('../models/badge');
var Issuer = require('../models/issuer');
var util = require('../lib/util');

test.applyFixtures({
  'issuer': new Issuer({
    name: 'Badge Authority',
    org: 'Some Org',
    contact: 'brian@example.org'
  }),
  'link-basic': new Badge({
    name: 'Link Badge, basic',
    shortname: 'link-basic',
    description: 'For doing links.',
    image: Buffer(128),
    behaviors: [{ shortname: 'link', count: 5 }]
  }),
  'instance': new BadgeInstance({
    user: 'brian@example.org',
    hash: 'hash',
    badge: 'link-advanced',
    assertion: '{ "assertion" : "yep" }',
    seen: false
  }),
  'other-instance': new BadgeInstance({
    user: 'brian@example.org',
    hash: 'hash',
    badge: 'link-hyper-advanced',
    assertion: '{ "assertion" : "yep" }',
    seen: false
  }),
}, function (fixtures) {
  test('BadgeInstance#save: test defaults', function (t) {
    var instance = new BadgeInstance({
      user: 'brian@example.org',
      badge: 'link-basic'
    });
    instance.save(function (err, result) {
      console.dir(err);
      t.notOk(err, 'should not have any errors');
      t.ok(instance.assertion, 'should have an assertion string');
      t.same(instance.hash, util.hash(instance.assertion), 'hash should be the hash of the assertion');
      t.end();
    })
  });

  test('BadgeInstance#userHasBadge', function (t) {
    var instance = fixtures['instance'];
    var user = instance.user;
    var badge = instance.badge;
    BadgeInstance.userHasBadge(user, badge, function (err, hasBadge) {
      t.notOk(err, 'should not have an error');
      t.same(hasBadge, true, 'user should have badge');
      BadgeInstance.userHasBadge(user, 'non-existent', function (err, hasBadge) {
        t.notOk(err, 'should not have an error');
        t.same(hasBadge, false, 'user should have badge');
        t.end();
      });
    });
  });

  test('BadgeInstance.markAllAsSeen', function (t) {
    var instance = fixtures['instance'];
    var instance2 = fixtures['other-instance'];
    var email = instance.user
    t.same(instance.seen, false, 'should start off false');
    t.same(instance2.seen, false, 'should start off false');
    BadgeInstance.markAllAsSeen(email, function (err) {
      t.notOk(err, 'should not have any errors');
      BadgeInstance.find({ user: email }, function (err, results) {
        t.same(results[0].seen, true, 'should become true');
        t.same(results[1].seen, true, 'should become true');
        t.end();
      });
    });
  });


  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});