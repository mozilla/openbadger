var test = require('./');
var db = require('../models');
var User = require('../models/user');
var Badge = require('../models/badge');
var BadgeInstance = require('../models/badge-instance');
var Issuer = require('../models/issuer');

var testEmail = 'brian@example.org';
test.applyFixtures({
  'issuer': new Issuer({
    name: 'Badge Authority',
    org: 'Some Org',
    contact: 'brian@example.org'
  }),
  'user': new User({
    user: testEmail,
    credit: { link: 5 }
  }),
  'link-basic': new Badge({
    name: 'Link Badge, basic',
    shortname: 'link-basic',
    description: 'For doing links.',
    image: Buffer(128),
    behaviors: [
      { shortname: 'link', count: 5 }
    ]
  }),
  'link-advanced': new Badge({
    name: 'Link Badge, advanced',
    shortname: 'link-advanced',
    description: 'For doing links, but like, a lot of them',
    image: Buffer(128),
    behaviors: [
      { shortname: 'link', count: 15 }
    ]
  }),
  'comment': new Badge({
    name : 'Commenting badge',
    shortname: 'comment',
    description: 'For doing lots of comments.',
    image: Buffer(128),
    behaviors: [
      { shortname: 'comment', count: 1 }
    ]
  }),
  'instance': new BadgeInstance({
    user: testEmail,
    badge: 'comment',
    assertion: '{"wut":"lol"}'
  })
}, function (fixtures) {
  test('User#save: Basic saving', function (t) {
    var user = new User({ user: 'some-guy@example.org' });
    user.save(function (err, result) {
      t.notOk(err, 'should not have an error');
      t.end();
    });
  });

  test('User#getCreditsAndBadges: valid, existing user', function (t) {
    var user = fixtures['user'];
    var email = user.user;
    User.getCreditsAndBadges(email, function (err, result) {
      t.notOk(err, 'should not have any errors');
      t.ok(result, 'should have some results');
      t.ok(result.behaviors.link, 'should have some link behaviors');
      t.ok(result.badges.length, 'should have some badges');
      t.end();
    });
  });

  test('User#getCreditsAndBadges: non-existing user', function (t) {
    User.getCreditsAndBadges('random-jabroni@example.org', function (err, result) {
      t.notOk(err, 'should not have any errors');
      t.ok(result, 'should have some results');
      t.end();
    });
  });

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
