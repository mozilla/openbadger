const test = require('./');
const db = require('../models');
const BadgeInstance = require('../models/badge-instance');
const Stats = require('../models/stats');
const util = require('../lib/util');

test.applyFixtures({
  'instance': new BadgeInstance({
    issuedOn: new Date('2012-10-15'),
    user: 'brian@example.org',
    hash: 'hash',
    badge: 'link-advanced',
    assertion: '{ "assertion" : "yep" }',
  }),
  'instance2': new BadgeInstance({
    issuedOn: new Date('2012-11-15'),
    user: 'brian@example.org',
    hash: 'hash',
    badge: 'link-hyper-advanced',
    assertion: '{ "assertion" : "yep" }',
  }),
  'instance3': new BadgeInstance({
    issuedOn: new Date('2012-12-15'),
    user: 'brian-delete@example.org',
    hash: 'hash',
    badge: 'link-hyper-advanced',
    assertion: '{ "assertion" : "yep" }',
  }),
  'instance4': new BadgeInstance({
    issuedOn: new Date('2013-01-15'),
    user: 'brian-delete@example.org',
    hash: 'otherhash',
    badge: 'link-turbo-advanced',
    assertion: '{ "assertion" : "yep" }',
  }),
  'instance5': new BadgeInstance({
    issuedOn: new Date('2013-01-16'),
    user: 'brian-delete@example.org',
    hash: 'otherhash',
    badge: 'link-mega-advanced',
    assertion: '{ "assertion" : "yep" }',
  }),
}, function (fixtures) {
  test('Stats.monthly', function (t) {
    Stats.monthly(function (err, stats) {
      t.notOk(err, 'should not have an error');
      t.same(stats['2011-01'], undefined, 'should not have badges for jan 2011');
      t.same(stats['2012-10'], 1, 'should have one badge');
      t.same(stats['2012-11'], 1, 'should have one badge');
      t.same(stats['2012-12'], 1, 'should have one badge');
      t.same(stats['2013-01'], 2, 'should have two badges');
      t.end();
    });
  });

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close(); t.end();
  });
})