const test = require('./');
const db = require('../models');
const User = require('../models/user');
const Badge = require('../models/badge');
const BadgeInstance = require('../models/badge-instance');
const util = require('../lib/util');

const TESTUSER = 'brian@example.org';
const ALL_AGES = [Badge.KID, Badge.TEEN, Badge.ADULT];

test.applyFixtures({
  'city-science': new Badge({
    shortname: 'city-science',
    categories: ['science'],
    name: 'City Science Badge',
    description: 'For earning a bunch of science badges',
    categoryAward: 'science',
    ageRange: ALL_AGES,
    image: Buffer(1),
  }),
  'city-math': new Badge({
    _id: 'city-math',
    shortname: 'city-math',
    categories: ['math'],
    name: 'City Math Badge',
    description: 'For earning a bunch of math badges',
    categoryAward: 'math',
    ageRange: ALL_AGES,
    image: Buffer(1),
  }),
  'participation-science': new Badge({
    shortname: 'participation-science',
    categories: ['science'],
    name: 'Participation Science Badge',
    description: 'For participating in science',
    type: 'participation',
    activityType: 'online',
    categoryAward: '',
    ageRange: ALL_AGES,
    image: Buffer(1),
  }),
  'offline-science': new Badge({
    shortname: 'offline-science',
    categories: ['science'],
    name: 'Offline Science Badge',
    description: 'For participating in offline science',
    type: 'achievement',
    activityType: 'offline',
    ageRange: ALL_AGES,
    image: Buffer(1),
  }),
  'pure-science': new Badge({
    shortname: 'pure-science',
    categories: ['science'],
    name: 'Pure Science',
    description: 'for sciencing',
    type: 'skill',
    activityType: 'online',
    categoryAward: '',
    ageRange: ALL_AGES,
    image: Buffer(1),
  }),
  'pure-math': new Badge({
    shortname: 'pure-math',
    categories: ['math'],
    name: 'Math',
    description: 'for mathing',
    type: 'skill',
    activityType: 'online',
    categoryAward: '',
    ageRange: ALL_AGES,
    image: Buffer(1),
  }),
  'kid-science': new Badge({
    shortname: 'kid-science',
    categories: ['science'],
    name: 'Kid Science',
    description: 'for sciencing (for kids)',
    type: 'skill',
    activityType: 'online',
    categoryAward: '',
    ageRange: ['0-13'],
    image: Buffer(1),
  }),
  'teen-science': new Badge({
    shortname: 'teen-science',
    categories: ['science'],
    name: 'Teen Science',
    description: 'for sciencing (for teens)',
    type: 'skill',
    activityType: 'online',
    categoryAward: '',
    ageRange: ['13-18'],
    image: Buffer(1),
  }),
  'adult-science': new Badge({
    shortname: 'adult-science',
    categories: ['science'],
    name: 'Adult Science',
    description: 'for sciencing (for teens)',
    type: 'skill',
    activityType: 'online',
    categoryAward: '',
    ageRange: ['19-24'],
    image: Buffer(1),
  }),
  'pure-knitting': new Badge({
    shortname: 'pure-knitting',
    categories: ['knitting'],
    name: 'Knitting',
    description: 'for knitting',
    type: 'skill',
    activityType: 'online',
    ageRange: ALL_AGES,
    image: Buffer(1),
  }),
  'science-and-math': new Badge({
    shortname: 'science-and-math',
    categories: ['science', 'math'],
    name: 'Science and Math',
    type: 'skill',
    activityType: 'online',
    description: 'for sciencing and mathing',
    categoryAward: '',
    ageRange: ALL_AGES,
    image: Buffer(1),
  }),
  'earned-badge': new Badge({
    _id: '1234',
    shortname: 'earned',
    categories: ['science', 'math'],
    name: 'Earned',
    type: 'skill',
    activityType: 'online',
    description: 'should not come up',
    categoryAward: '',
    ageRange: ALL_AGES,
    image: Buffer(1),
  }),
  'earned-badge-instance': new BadgeInstance({
    user: TESTUSER,
    badge: '1234',
  }),
  'city-math-instance': new BadgeInstance({
    user: TESTUSER,
    badge: 'city-math',
  }),
}, function (fx) {

  test('similar badges, no user', function (t) {
    const pureScience = fx['pure-science'];
    pureScience.getSimilar(function (err, badges) {
      const shortnames = badges.map(prop('shortname'));
      const hasMath = shortnames.some(has('pure-math'));
      const hasSelf = shortnames.some(has('pure-science'));
      const hasScienceAndMath = shortnames.some(has('science-and-math'));
      t.same(hasMath, false, 'should not have math');
      t.same(hasSelf, false, 'should not have self');
      t.same(hasScienceAndMath, true, 'should have science-and-math');
      t.end();
    });
  });

  test('similar badges, with user', function (t) {
    const pureScience = fx['pure-science'];
    pureScience.getSimilar(TESTUSER, function (err, badges) {
      const names = badges.map(prop('shortname'));
      const hasMath = badges.some(has('pure-math'));
      const hasEarned = badges.some(has('earned'));

      t.same(hasMath, false, 'should not have math');
      t.same(hasEarned, false, 'should not have the earned badge');
      t.end();
    });
  });

  test('recommended badges', function (t) {
    Badge.getRecommendations({
      email: TESTUSER,
      ageRange: Badge.ADULT
    }, function (err, badges) {
      const names = badges.map(prop('shortname'));
      t.equal(contains(names, 'participation-science'), false,
              'no participation badges');
      t.equal(contains(names, 'city-science'), false,
              'no category-level badges');
      t.equal(contains(names, 'earned-badge'), false,
              'no earned badges');
      t.equal(contains(names, 'science-and-math'), false,
              'no math badges, already earned category badge');
      t.equal(contains(names, 'pure-math'), false,
              'no math badges, already earned category badge');
      t.equal(contains(names, 'pure-knitting'), false,
              'no badges that are off-track');
      t.equal(contains(names, 'kid-science'), false,
              'no age-inappropriate badges');
      t.equal(contains(names, 'teen-science'), false,
              'no age-inappropriate badges');
      t.equal(contains(names, 'pure-science'), true,
              'should contain pure-science badge');
      t.equal(contains(names, 'adult-science'), true,
              'should contain adult-science badge');
      t.equal(lastElem(names), 'offline-science',
              'should recommend offline badges last');
      console.dir(names);
      t.end();
    });
  });


  test('finish #', function (t) {
    db.close(); t.end();
  });

});

const prop = util.prop;

function lastElem(arr) {
  return arr[arr.length-1];
}

function contains(arr, name) {
  return arr.some(has(name));
}

function has(name) {
  return function (n) {
    return n == name;
  };
}
