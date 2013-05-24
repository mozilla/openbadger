const test = require('./');
const env = require('../lib/environment');
const util = require('../lib/util');
const db = require('../models');
const Badge = require('../models/badge');
const BadgeInstance = require('../models/badge-instance');

const USER = 'user@example.org';

test.applyFixtures({
  'category-badge': new Badge({
    name: 'category badge',
    description: 'category',
    category: 'science',
    categoryAward: true,
    categoryRequirement: 5,
    image: Buffer(1),
  }),
  'tiny-badge': new Badge({
    name: 'tiny badge',
    description: 'tiny',
    category: 'science',
    categoryWeight: 1,
    image: Buffer(1),
  }),
  'small-badge': new Badge({
    name: 'small badge',
    description: 'small',
    category: 'science',
    categoryWeight: 2,
    image: Buffer(1),
  }),
  'large-badge': new Badge({
    name: 'large badge',
    description: 'large',
    category: 'science',
    categoryWeight: 5,
    image: Buffer(1),
  }),
}, function (fx) {
  test('awarding stuff', function (t) {
    const smallBadge = fx['small-badge'];
    const largeBadge = fx['large-badge'];
    const tinyBadge = fx['tiny-badge'];
    const categoryBadge = fx['category-badge'];
    smallBadge.award(USER, function (err, inst, auto) {
      t.same(auto.length, 0);
      largeBadge.award(USER, function (err, inst, auto) {
        t.same(auto.length, 1);
        tinyBadge.award(USER, function (err, inst, auto) {
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
