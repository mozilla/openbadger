const test = require('./');
const db = require('../models');
const BadgeInstance = require('../models/badge-instance');
const Badge = require('../models/badge');
const Issuer = require('../models/issuer');
const util = require('../lib/util');
const env = require('../lib/environment');

test.applyFixtures({
  'issuer': new Issuer({
    name: 'Badge Authority',
    org: 'Some Org',
    contact: 'brian@example.org'
  }),
  'link-basic': new Badge({
    _id: 'link-basic',
    name: 'Link Badge, basic',
    shortname: 'link-basic',
    description: 'For doing links.',
    image: Buffer(128),
    behaviors: [{ shortname: 'link', count: 5 }]
  }),
  'instance': new BadgeInstance({
    _id: 'abcd',
    user: 'brian@example.org',
    hash: 'hash',
    badge: 'link-basic',
    assertion: '{ "assertion" : "yep" }',
    seen: false
  }),
  'other-instance': new BadgeInstance({
    user: 'brian@example.org',
    hash: 'hash',
    badge: 'link-basic',
    assertion: '{ "assertion" : "yep" }',
    seen: false
  }),
  'delete-instance1': new BadgeInstance({
    user: 'brian-delete@example.org',
    hash: 'hash',
    badge: 'link-basic',
    assertion: '{ "assertion" : "yep" }',
    seen: false
  }),
  'delete-instance2': new BadgeInstance({
    user: 'brian-delete@example.org',
    hash: 'otherhash',
    badge: 'link-basic',
    assertion: '{ "assertion" : "yep" }',
    seen: false
  }),
}, function (fixtures) {
  test('BadgeInstance#makeAssertion', function (t) {
    env.temp({ origin: 'https://example.org' }, function (done) {
      const instance = fixtures['instance'];
      const badge = fixtures['link-basic'];
      instance.populate('badge', function () {
        const expect = {
          uid: instance._id,
          recipient: {
            identity: util.sha256(instance.user, ''),
            type: 'email',
            hashed: true,
          },
          badge: badge.absoluteUrl('json'),
          verify: {
            type: 'hosted',
            url: instance.absoluteUrl('assertion'),
          },
          issuedOn: instance.issuedOnUnix()
        };
        t.same(instance.makeAssertion(), expect);
        t.end();
        return done();
      });
    });
  });


  test('BadgeInstance#userHasBadge', function (t) {
    const instance = fixtures['instance'];
    const user = instance.user;
    const badge = instance.badge._id;
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
    var email = instance.user;
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

  test('BadgeInstance.deleteAllByUser', function (t) {
    var instance1 = fixtures['delete-instance1'];
    var instance2 = fixtures['delete-instance2'];
    var email = instance1.user;
    BadgeInstance.deleteAllByUser(email, function (err) {
      BadgeInstance.find({ user: email }, function (err, instances) {
        t.same(instances.length, 0, 'should not have any instances');
        t.end();
      });
    });
  });

  test('BadgeInstance.makeAssertion', function (t) {
    const instance = fixtures['instance1'];
    console.dir(instance);
    t.end();
  });


  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
