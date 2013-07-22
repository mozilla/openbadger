const _ = require('underscore');
const test = require('./');
const db = require('../models');
const User = require('../models/user');
const Badge = require('../models/badge');
const BadgeInstance = require('../models/badge-instance');
const Program = require('../models/program');
const Issuer = require('../models/issuer');
const util = require('../lib/util');

const TESTUSER = 'brian@example.org';
const ALL_AGES = [Badge.KID, Badge.TEEN, Badge.ADULT];
const TODAY = new Date('2013-06-03');

function createBadge(id, obj) {
  return new Badge(_.defaults(obj||{}, {
    _id: id,
    shortname: id,
    name: 'badge',
    description: 'desc',
    activityType: 'online',
    ageRange: ALL_AGES,
    image: Buffer(1),
    program: 'in-progress',
    categoryAward: '',
    type: 'skill',
  }));
}

test.applyFixtures({
  // Issuer
  'issuer': new Issuer({
    _id: 'issuer',
    shortname: 'issuer',
    name: 'Issuer',
    programs: ['not-yet', 'in-progress', 'ended']
  }),

  // Programs
  'not-yet-program': new Program({
    _id: 'not-yet',
    issuer: 'issuer',
    shortname: 'not-yet',
    startDate: new Date('2099-06-15'),
    endDate: new Date('2099-07-15'),
    name: 'Not Yet',
  }),
  'in-progress-program': new Program({
    _id: 'in-progress',
    issuer: 'issuer',
    shortname: 'in-progress',
    startDate: new Date('2013-06-01'),
    endDate: new Date('2099-07-15'),
    name: 'In Progress',
  }),
  'ended-program': new Program({
    _id: 'ended',
    issuer: 'issuer',
    shortname: 'ended',
    startDate: new Date('2013-05-15'),
    endDate: new Date('2013-06-01'),
    name: 'Ended',
  }),

  // Badges
  'not-yet-science': createBadge('not-yet-science', {
    categories: ['science'],
    program: 'not-yet',
  }),
  'ended-science': createBadge('ended-science', {
    categories: ['science'],
    program: 'ended',
  }),
  'in-progress-science': createBadge('in-progress-science', {
    categories: ['science'],
    program: 'in-progress',
  }),
  'city-science': createBadge('city-science', {
    categories: ['science'],
    categoryAward: 'science',
  }),
  'city-math': createBadge('city-math', {
    categories: ['math'],
    categoryAward: 'math',
  }),
  'participation-science': createBadge('participation-science', {
    type: 'participation',
    categories: ['science'],
  }),
  'offline-science': createBadge('offline-science', {
    categories: ['science'],
    activityType: 'offline',
  }),
  'pure-science': createBadge('pure-science', {
    categories: ['science'],
  }),
  'pure-math': createBadge('pure-math', {
    categories: ['math'],
  }),
  'kid-science': createBadge('kid-science', {
    categories: ['science'],
    ageRange: ['0-13'],
  }),
  'teen-science': createBadge('teen-science', {
    categories: ['science'],
    ageRange: ['13-18'],
  }),
  'adult-science': createBadge('adult-science', {
    categories: ['science'],
    ageRange: ['19-24'],
  }),
  'pure-knitting': createBadge('pure-knitting', {
    categories: ['knitting'],
  }),
  'science-and-math': createBadge('science-and-math', {
    categories: ['science', 'math'],
  }),
  'earned-badge': createBadge('earned', {
    categories: ['science', 'math'],
  }),
  'no-categories-badge': createBadge('no-categories', {
    categories: null,
  }),

  // Instances
  'earned-badge-instance': new BadgeInstance({
    user: TESTUSER,
    badge: 'earned',
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

  test('similar badges, no user, no categories', function (t) {
    const noCategories = fx['no-categories-badge'];
    noCategories.getSimilar(function (err, badges) {
      t.notOk(err, 'no errors');
      t.same(badges, [], 'should be an empty array');
      t.end();
    });
  });

  test('recommended badges', function (t) {
    Badge.getRecommendations({
      email: TESTUSER,
      ageRange: Badge.ADULT
    }, function (err, badges) {
      const names = badges.map(prop('shortname'));

      t.same(badges[0].program.issuer._id, fx['issuer']._id,
             'should have populated issuer');

      // misc
      t.equal(contains(names, 'pure-science'), true,
              'should contain pure-science badge');
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

      // age related
      t.equal(contains(names, 'adult-science'), true,
              'should contain adult-science badge');
      t.equal(contains(names, 'kid-science'), false,
              'no age-inappropriate badges');
      t.equal(contains(names, 'teen-science'), false,
              'no age-inappropriate badges');

      // program related
      t.equal(contains(names, 'in-progress-science'), true,
              'should contain in-progress science badge');

      t.equal(contains(names, 'not-yet-science'), false,
              'no badges from inactive programs');

      t.equal(contains(names, 'ended-science'), false,
              'no badges from inactive programs');

      // offline related
      t.equal(contains(names, 'offline-science'), false,
              'should not recommend offline badges');

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
