const test = require('./');
const env = require('../lib/environment');
const util = require('../lib/util');
const db = require('../models');
const Badge = require('../models/badge');
const BadgeInstance = require('../models/badge-instance');

const USER_1 = 'user1@example.org';
const USER_2 = 'user2@example.org';

test.applyFixtures({
  'science-badge': new Badge({
    _id: 'bba3989d4825d81b5587f96b7d8ba6941d590af5',
    name: 'science badge',
    description: 'this is THE science badge!',
    categoryAward: 'science',
    categoryRequirement: 5,
    image: Buffer(1),
  }),
  'art-badge': new Badge({
    _id: 'bba3989d4825d81b5587f96b7d8ba6941d590af6',
    name: 'art badge',
    description: 'this is THE art badge!',
    categoryAward: 'art',
    categoryRequirement: 6,
    image: Buffer(1),
  }),
  'tiny-badge': new Badge({
    name: 'tiny badge',
    description: 'tiny',
    categories: ['science', 'art'],
    categoryWeight: 1,
    image: Buffer(1),
  }),
  'small-badge': new Badge({
    name: 'small badge',
    description: 'small',
    categories: ['science'],
    categoryWeight: 2,
    image: Buffer(1),
  }),
  'large-badge': new Badge({
    name: 'large badge',
    description: 'large',
    categories: ['science', 'art'],
    categoryWeight: 5,
    image: Buffer(1),
  }),
}, function (fx) {
  const smallBadge = fx['small-badge'];
  const largeBadge = fx['large-badge'];
  const tinyBadge = fx['tiny-badge'];

  test('staggered awarding', function (t) {
    smallBadge.award(USER_1, function (err, inst, auto) {
      t.same(auto.length, 0);
      largeBadge.award(USER_1, function (err, inst, auto) {
        t.same(auto.length, 1);
        t.same(auto[0].badge, fx['science-badge']._id);
        tinyBadge.award(USER_1, function (err, inst, auto) {
          t.same(auto.length, 1);
          t.same(auto[0].badge, fx['art-badge']._id);
          t.end();
        });
      });
    });
  });

  test('simultaneous awarding', function (t) {
    tinyBadge.award(USER_2, function (err, inst, auto) {
      t.same(auto.length, 0);
      largeBadge.award(USER_2, function (err, inst, auto) {
        t.same(auto.length, 2);
        t.same(auto[0].badge, fx['science-badge']._id);
        t.same(auto[1].badge, fx['art-badge']._id);
        smallBadge.award(USER_2, function (err, inst, auto) {
          t.same(auto.length, 0);
          t.end();
        });
      });
    });
  });

  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
