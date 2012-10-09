var test = require('./');
var db = require('../models');
var Badge = require('../models/badge');

function validBadge() {
  return new Badge({
    shortname: 'badge-name',
    name: 'badge name',
    description: 'badge description',
    behaviors: [],
    prerequisites: [],
  });
};

var fixtures = {
  'link-basic': new Badge({
    name: 'Link Badge, basic',
    shortname: 'link-badge-basic',
    description: 'For doing links.',
    behaviors: [
      { name: 'link', required: 5 }
    ]
  }),
  'link-advanced': new Badge({
    name : 'Link Badge, advanced',
    shortname: 'link-badge-advanced',
    description: 'For doing lots of links.',
    behaviors: [
      { name: 'link', required: 10 }
    ]
  }),
  'comment': new Badge({
    name : 'Commenting badge',
    shortname: 'comment-badge',
    description: 'For doing lots of comments.',
    behaviors: [
      { name: 'comment', required: 5 }
    ]
  })
};

test.applyFixtures(fixtures, function () {
  test('Badge: name too long', function (t) {
    var length = 128;
    var badge = validBadge();
    badge.name = test.randomstring(length + 1);
    badge.validate(function (err, results) {
      var errorKeys = Object.keys(err.errors);
      t.same(errorKeys, ['name'], 'should only have one error');
      t.same(err.errors.name.type, 'maxLength', 'should be a maxLength error');
      t.end();
    });
  });

  test('Badge: description too long', function (t) {
    var length = 128;
    var badge = validBadge();
    badge.description = test.randomstring(length + 1);
    badge.validate(function (err, results) {
      var errorKeys = Object.keys(err.errors);
      t.same(errorKeys, ['description'], 'should only have one error');
      t.same(err.errors.description.type, 'maxLength', 'should be a maxLength error');
      t.end();
    });
  });

  test('Badge.findByBehavior: finding badges by behavior', function (t) {
    var behavior = 'link';
    Badge.findByBehavior(behavior, function (err, badges) {
      var expectIds = [
        fixtures['link-basic'].id,
        fixtures['link-advanced'].id
      ].sort();
      var actualIds = badges.map(function (o) { return o.id }).sort();
      t.same(actualIds, expectIds, 'should get just the `link` badges back');
      t.end();
    });
  });

  // necessary to stop the test runner
  test('shut down', function (t) {
    db.close();
    t.end();
  });
});
