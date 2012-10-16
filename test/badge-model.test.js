var fs = require('fs');
var pathutil = require('path');
var test = require('./');
var env = require('../lib/environment');
var util = require('../lib/util');
var db = require('../models');
var Badge = require('../models/badge');
var Issuer = require('../models/issuer');
var User = require('../models/user');
var BadgeInstance = require('../models/badge-instance');

function asset(name) {
  return fs.readFileSync(pathutil.join(__dirname, 'assets', name));
}

function validBadge() {
  return new Badge({
    shortname: 'badge-name',
    name: 'badge name',
    description: 'badge description',
    behaviors: [],
    prerequisites: [],
    image: asset('sample.png')
  });
}

var fixtures = {
  'issuer': new Issuer({
    name: 'Badge Authority',
    org: 'Some Org',
    contact: 'brian@example.org'
  }),
  'link-basic': new Badge({
    name: 'Link Badge, basic',
    shortname: 'link-badge-basic',
    description: 'For doing links.',
    image: asset('sample.png'),
    behaviors: [
      { shortname: 'link', count: 5 }
    ]
  }),
  'link-advanced': new Badge({
    name : 'Link Badge, advanced',
    shortname: 'link-badge-advanced',
    description: 'For doing lots of links.',
    image: asset('sample.png'),
    behaviors: [
      { shortname: 'link', count: 10 }
    ]
  }),
  'comment': new Badge({
    name : 'Commenting badge',
    shortname: 'comment',
    description: 'For doing lots of comments.',
    image: asset('sample.png'),
    behaviors: [
      { shortname: 'comment', count: 5 }
    ]
  }),
  'link-comment': new Badge({
    name : 'Linking and commenting badge',
    shortname: 'link-comment',
    description: 'For doing lots of comments and links',
    image: asset('sample.png'),
    behaviors: [
      { shortname: 'comment', count: 5 },
      { shortname: 'link', count: 5 }
    ]
  }),
  'user': new User({
    user: 'brian@example.org',
    credit: {}
  }),
  'instance': new BadgeInstance({
    user: 'brian@example.org',
    hash: 'hash',
    badge: 'link-basic',
    assertion: '{ "assertion" : "yep" }',
    seen: true
  })
};

test.applyFixtures(fixtures, function () {
  test('Badge#imageDataURI', function (t) {
    var badge = new Badge({image: asset('sample.png')});
    var dataURI = badge.imageDataURI();
    t.ok(dataURI.match(/^data:image\/png;base64,.+$/), 'should match data uri format');
    t.end();
  });


  test('Badge#save: saving a valid badge', function (t) {
    var expect = validBadge();
    expect.save(function (err) {
      t.notOk(err, 'should not have an error when saving');
      Badge.findById(expect.id, function (err, result) {
        t.notOk(err, 'should not have an error when finding');
        t.ok(result.image, 'should have an image');
        t.same(result.image, expect.image);
        t.end();
      });
    });
  });

  test('Badge#validate: image too big', function (t) {
    var errorKeys;
    var badge = validBadge();
    var length = 257 * 1024
    badge.image = Buffer(length);
    badge.validate(function (err) {
      t.ok(err, 'should have errors');
      errorKeys = Object.keys(err.errors);
      t.same(errorKeys, ['image'], 'should only have one error');
      t.same(err.errors['image'].type, 'maxLength', 'should be a maxLength error');
      t.end();
    });
  });

  test('Badge#validate: name too long', function (t) {
    var errorKeys;
    var length = 128;
    var badge = validBadge();
    badge.name = test.randomstring(length + 1);
    badge.validate(function (err, results) {
      t.ok(err, 'should have errors');
      errorKeys = Object.keys(err.errors);
      t.same(errorKeys, ['name'], 'should only have one error');
      t.same(err.errors['name'].type, 'maxLength', 'should be a maxLength error');
      t.end();
    });
  });

  test('Badge#validate: description too long', function (t) {
    var errorKeys;
    var length = 128;
    var badge = validBadge();
    badge.description = test.randomstring(length + 1);
    badge.validate(function (err, results) {
      t.ok(err, 'should have errors');
      errorKeys = Object.keys(err.errors);
      t.same(errorKeys, ['description'], 'should only have one error');
      t.same(err.errors['description'].type, 'maxLength', 'should be a maxLength error');
      t.end();
    });
  });

  test('Badge.findByBehavior: finding badges by behavior', function (t) {
    var behavior = 'link';
    Badge.findByBehavior(behavior, function (err, badges) {
      var expectIds = [
        fixtures['link-basic'].id,
        fixtures['link-advanced'].id,
        fixtures['link-comment'].id
      ].sort();
      var actualIds = badges.map(function (o) { return o.id }).sort();
      t.same(actualIds, expectIds, 'should get just the `link` badges back');
      t.end();
    });
  });

  test('Badge.findByBehavior: finding badges by multiple behaviors', function (t) {
    var behaviors = ['link', 'comment'];
    Badge.findByBehavior(behaviors, function (err, badges) {
      var expectIds = [
        fixtures['link-basic'].id,
        fixtures['link-advanced'].id,
        fixtures['link-comment'].id,
        fixtures['comment'].id,
      ].sort();
      var actualIds = badges.map(function (o) { return o.id }).sort();
      t.same(actualIds, expectIds, 'should get link and comment badges back');
      t.end();
    });
  });

  test('Badge#earnableBy: should have enough', function (t) {
    var badge = fixtures['link-comment'];
    var user = { credit: { link: 10, comment: 10 }};
    var expect = true;
    var result = badge.earnableBy(user);
    t.same(expect, result);
    t.end();
  });

  test('Badge#earnableBy: not enough', function (t) {
    var badge = fixtures['link-comment'];
    var user = { credit: { link: 10 }}
    var expect = false;
    var result = badge.earnableBy(user);
    t.same(expect, result);
    t.end();
  });

  test('Badge#award: award a badge to a user', function (t) {
    var badge = fixtures['link-comment'];
    var email = fixtures['user'].user;
    badge.award(email, function (err, instance) {
      t.notOk(err, 'should not have an error');
      t.ok(instance, 'should have a badge instance');
      t.same(instance.user, email, 'should be assigned to the right user');
      badge.award(email, function (err, instance) {
        t.notOk(err, 'should not have an error');
        t.notOk(instance, 'should not have an instance');
        t.end();
      });
    });
  });

  test('Badge#creditsUntilAward: see how many credits remain until user gets badge', function (t) {
    var badge = fixtures['link-comment'];
    var user = { credit: { link: 26 }}
    var expect = { comment: 5 };
    var result = badge.creditsUntilAward(user);
    t.same(result, expect);
    t.end();
  });

  test('Badge default: shortname', function (t) {
    var badge = new Badge({
      name: 'An   awesome badge!',
      description: 'some sorta badge',
    })
    badge.save(function (err, result) {
      t.same(badge.shortname, 'an-awesome-badge', 'should slugify if shortname is not provided');
      t.end();
    });
  });

  test('Badge: finding one by id', function (t) {
    var expect = fixtures['link-basic'];
    Badge.findById(expect.id, function (err, badge) {
      t.notOk(err, 'should not have an error');
      t.same(expect.id, badge.id, 'should get the right badge');
      t.end();
    });
  });

  test('Badge#removeBehavior', function (t) {
    var badge = validBadge();
    badge.behaviors = [
      { shortname: 'link', count: 10 },
      { shortname: 'comment', count: 20 }
    ];
    badge.removeBehavior('link');
    t.same(badge.behaviors.length, 1, 'should have one left');
    t.same(badge.behaviors[0].shortname, 'comment', 'should be the comment one');
    t.end();
  });

  test('Badge#makeAssertion: makes a good assertion', function (t) {
    var tempenv = { protocol: 'http', host: 'example.org', port: 80 };
    env.temp(tempenv, function (resetEnv) {
      var badge = fixtures['comment'];
      var issuer = fixtures['issuer'];
      var recipient = 'brian@example.org';
      var salt = 'salt';
      var expect = {
        recipient: util.sha256(recipient, salt),
        salt: salt,
        badge: {
          version: '0.5.0',
          criteria: badge.absoluteUrl('criteria'),
          image: badge.absoluteUrl('image'),
          description: badge.description,
          name: badge.name,
          issuer: {
            name: issuer.name,
            org: issuer.org,
            contact: issuer.contact,
            origin: env.origin()
          }
        }
      };
      badge.makeAssertion({
        recipient: recipient,
        salt: salt,
      }, {
        json: false
      }, function (err, result) {
        t.same(result, expect);
        resetEnv();
        t.end();
      });
    });
  });

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close();
    t.end();
  });
});
