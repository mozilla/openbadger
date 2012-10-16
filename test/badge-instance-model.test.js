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
  'dummy-instance': new BadgeInstance({
    user: 'brian@example.org',
    hash: 'hash',
    badge: 'link-advanced',
    assertion: '{ "assertion" : "yep" }',
    seen: true
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
    var instance = fixtures['dummy-instance'];
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

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});