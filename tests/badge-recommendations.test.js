const test = require('./');
const db = require('../models');
const User = require('../models/user');
const Badge = require('../models/badge');
const BadgeInstance = require('../models/badge-instance');
const util = require('../lib/util');

const TESTUSER = 'brian@example.org';

test.applyFixtures({
  'pure-science': new Badge({
    shortname: 'pure-science',
    categories: ['science'],
    name: 'Pure Science',
    description: 'for sciencing',
    image: Buffer(1),
  }),
  'pure-math': new Badge({
    shortname: 'pure-math',
    categories: ['math'],
    name: 'Math',
    description: 'for mathing',
    image: Buffer(1),
  }),
  'science-and-math': new Badge({
    shortname: 'science-and-math',
    categories: ['science', 'math'],
    name: 'Science and Math',
    description: 'for sciencing and mathing',
    image: Buffer(1),
  }),
  'earned-badge': new Badge({
    _id: '1234',
    shortname: 'earned',
    categories: ['science', 'math'],
    name: 'Earned',
    description: 'should not come up',
    image: Buffer(1),
  }),
  'instance': new BadgeInstance({
    user: TESTUSER,
    badge: '1234',
  }),
}, function (fx) {

  test('Recommendation, no user', function (t) {
    const pureScience = fx['pure-science'];
    pureScience.getRecommendations(function (err, badges) {
      const shortnames = badges
        .map(util.prop('shortname'));
      const hasMath = shortnames
        .some(has('pure-math'));
      const hasSelf = shortnames
        .some(has('pure-science'));
      t.same(hasMath, false, 'should not have math');
      t.same(hasSelf, false, 'should not have self');
      t.end();
    });
  });

  test('Recommendation, with user', function (t) {
    const pureScience = fx['pure-science'];
    pureScience.getRecommendations(TESTUSER, function (err, badges) {
      const names = badges.map(util.prop('shortname'));
      const hasMath = badges.some(has('pure-math'));
      const hasEarned = badges.some(has('earned'));

      t.same(hasMath, false, 'should not have math');
      t.same(hasEarned, false, 'should not have the earned badge');
      t.end();
    });
  });

  test('finish #', function (t) {
    db.close(); t.end();
  });

})

function has(name) {
  return function (n) {
    return n == name;
  };
}
