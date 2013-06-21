const async = require('async');
const test = require('./');
const env = require('../lib/environment');
const util = require('../lib/util');
const db = require('../models');
const Badge = require('../models/badge');

function validBadge() {
  return new Badge({
    shortname: 'badge-name',
    name: 'badge name',
    description: 'badge description',
    behaviors: [],
    prerequisites: [],
    image: test.asset('sample.png')
  });
}

var fixtures = require('./badge-model.fixtures.js');
test.applyFixtures(fixtures, function () {
  test('Badge.parseRubricItems() works w/ bulleted lists', function(t) {
    var criteria = [
      '* lol',
      '* oof (optional)',
      'hi'
    ].join('\n');

    t.same(Badge.parseRubricItems(criteria), [
      {
        text: 'lol',
        required: true
      },
      {
        text: 'oof (optional)',
        required: false
      }
    ]);
    t.end();
  });

  test('Badge.parseRubricItems() works w/o bulleted lists', function(t) {
    var criteria = [
      'hi',
      'there',
      'dood'
    ].join('\n');

    t.same(Badge.parseRubricItems(criteria), [
      {
        text: 'Satisfies the following criteria:\nhi\nthere\ndood',
        required: true
      }
    ]);
    t.end();
  });

  test('Badge#getRubricItems works w/ criteria', function(t) {
    t.same(fixtures['with-criteria'].getRubricItems(), [
      {
        text: 'person is awesome',
        required: true
      }
    ]);
    t.end();
  });

  test('Badge#getRubricItems works w/o criteria', function(t) {
    t.same(fixtures['random-badge'].getRubricItems(), []);
    t.end();
  });

  test('Badge#makeJson', function (t) {
    env.temp({origin: 'https://example.org'}, function (done) {
      const program = fixtures['program'];
      const badge = fixtures['link-basic'];

      badge.populate('program', function () {
        const expect = {
          name: badge.name,
          description: badge.description,
          image: badge.absoluteUrl('image'),
          criteria: badge.absoluteUrl('criteria'),
          issuer: program.absoluteUrl('json'),
          tags: badge.tags
        };
        t.same(badge.makeJson(), expect);
        t.end();
        done();
      });
    });
  });


  test('Badge#imageDataURI', function (t) {
    var badge = new Badge({image: test.asset('sample.png')});
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

  test('Badge#save: category info is normalized for awards', function(t) {
    var badge = validBadge();
    badge.shortname += "_cataward";
    badge.name += " cataward";
    badge.categoryAward = "foo";
    badge.categories = ["lol"];
    badge.categoryWeight = 50;
    badge.categoryRequirement = 5;
    badge.save(function(err, badge) {
      if (err) throw err;
      t.same(badge.categories.toObject(), []);
      t.equal(badge.categoryWeight, 0);
      t.equal(badge.categoryRequirement, 5);
      t.end();
    });
  });

  test('Badge#save: category info is normalized for non-awards', function(t) {
    var badge = validBadge();
    badge.shortname += "_nonaward";
    badge.name += " nonaward";
    badge.categoryAward = "";
    badge.categories = ["lol"];
    badge.categoryWeight = 50;
    badge.categoryRequirement = 5;
    badge.save(function(err, badge) {
      if (err) throw err;
      t.same(badge.categories.toObject(), ["lol"]);
      t.equal(badge.categoryWeight, 50);
      t.equal(badge.categoryRequirement, 0);
      t.end();
    });
  });

  test('Badge#validate: image too big', function (t) {
    var errorKeys;
    var badge = validBadge();
    var length = 257 * 1024;
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
    var user = { credit: { link: 10 }};
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
    var user = { credit: { link: 26 }};
    var expect = { comment: 5 };
    var result = badge.creditsUntilAward(user);
    t.same(result, expect);
    t.end();
  });

  test('Badge default: shortname', function (t) {
    var badge = new Badge({
      name: 'An   awesome badge!',
      description: 'some sorta badge',
    });
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

  test('Badge.getAll: get all the badges keyed by shortname', function (t) {
    var name = 'link-basic';
    var expect = fixtures[name];
    Badge.getAll(function (err, badges) {
      t.notOk(err, 'should not have any errors');
      t.ok(badges, 'should have some badges');
      t.same(badges[name].id, expect.id);
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

  test('Badge#hasClaimCode', function (t) {
    const badge = fixtures['offline-badge'];
    const code = 'will-claim';
    t.same(badge.hasClaimCode(code), true);
    t.same(badge.hasClaimCode('nopeniopenope'), false);
    t.end();
  });

  test('Badge#getClaimCodes', function (t) {
    const badge = fixtures['offline-badge'];
    const expect = [
      {code: 'already-claimed', claimed: true},
      {code: 'never-claim', claimed: false},
      {code: 'will-claim', claimed: false},
      {code: 'reserved-claim', reservedFor: 'foo@bar.org', claimed: false },
      {code: 'remove-claim', claimed: false},
    ];
;
    t.same(badge.getClaimCodes(), expect);
    t.end();
  });

  test('Badge#getClaimCodes, only unclaimed', function (t) {
    const badge = fixtures['offline-badge'];
    const expect = [
      {code: 'never-claim', claimed: false},
      {code: 'will-claim', claimed: false},
      {code: 'reserved-claim', reservedFor: 'foo@bar.org', claimed: false },
      {code: 'remove-claim', claimed: false}
    ];
    t.same(badge.getClaimCodes({unclaimed: true}), expect);
    t.end();
  });

  test('Badge#addClaimCodes', function (t) {
    const badge = fixtures['offline-badge'];
    const codes = ['lethargic-hummingbird', 'woeful-turtle'];
    badge.addClaimCodes(codes, function (err, accepted, rejected) {
      t.notOk(err, 'should not have any errors');
      t.notOk(rejected.length, 'should not have rejected any');
      t.same(accepted, codes);

      badge.addClaimCodes(codes, function (err, accepted, rejected) {
        t.notOk(err, 'should not have any errors');
        t.notOk(accepted.length, 'should not have accepted any');
        t.same(rejected, codes);
        t.end();
      });
    });
  });

  test('Badge#addClaimCodes, filter incoming dups', function (t) {
    const badge = fixtures['offline-badge'];
    const codes = ['duplicate', 'duplicate', 'duplicate', 'duplicate', 'harrison-ford'];
    badge.addClaimCodes(codes, function (err, accepted, rejected) {
      t.notOk(err, 'should not have any errors');
      t.notOk(rejected.length, 'should not have rejected any');
      t.same(accepted, ['duplicate', 'harrison-ford']);
      t.end();
    });
  });

  test('Badge#addClaimCodes, with limit option', function (t) {
    const badge = fixtures['offline-badge'];
    const original = badge.claimCodes.length;
    const codes = ['already-claimed', 'one', 'will-claim', 'two', 'never-claim', 'three', 'four', 'five'];
    const limit = 3;
    const options = {codes: codes, limit: limit };
    badge.addClaimCodes(options, function (err, accepted, rejected) {
      t.notOk(err, 'should not have any errors');
      t.same(accepted, ['one', 'two', 'three']);
      t.same(rejected, ['already-claimed', 'will-claim', 'never-claim', 'four', 'five']);
      t.end();
    });
  });

  function checkRedeem(t, badge, code, email, expected) {
    return function(cb) {
      badge.redeemClaimCode(code, email, function(err, result) {
        if (err) return cb(err);
        t.same(result, expected);
        cb();
      });
    };
  }

  test('Badge#redeemClaimCode', function (t) {
    const badge = fixtures['offline-badge'];
    const code ='will-claim';
    async.series([
      checkRedeem(t, badge, code, 'brian@example.org', true),
      checkRedeem(t, badge, code, 'brian@example.org', true),
      checkRedeem(t, badge, code, 'otherguy@example.org', false)
    ], function(err) {
      if (err) throw err;
      t.end();
    });
  });

  test('Badge#redeemClaimCode, multi', function (t) {
    const badge = fixtures['multi-claim-badge'];
    const code ='multi-claim';
    async.series([
      checkRedeem(t, badge, code, 'brian@example.org', true),
      checkRedeem(t, badge, code, 'anyone@example.org', true),
      checkRedeem(t, badge, code, 'otherguy@example.org', true)      
    ], function(err) {
      if (err) throw err;
      t.end();
    });
  });

  test('Badge#claimCodeIsClaimed', function (t) {
    const badge = fixtures['offline-badge'];
    const code ='already-claimed';
    t.same(badge.claimCodeIsClaimed(code), true);
    t.same(badge.claimCodeIsClaimed('never-claim'), false);
    t.same(badge.claimCodeIsClaimed('does not exist'), null);
    t.end();
  });

  test('Badge#claimCodeIsClaimed, multi', function (t) {
    const badge = fixtures['multi-claim-badge'];
    const code ='multi-claim';
    t.same(badge.claimCodeIsClaimed(code), false);
    t.end();
  });

  test('Badge#getClaimCode', function (t) {
    const badge = fixtures['offline-badge'];
    const code = badge.getClaimCode('already-claimed');
    t.same(code.claimedBy, 'brian@example.org');
    t.end();
  });

  test('Badge.findByClaimCode', function (t) {
    const code = 'will-claim';
    Badge.findByClaimCode(code, function (err, badge) {
      t.notOk(err, 'no error');
      t.ok(badge, 'yes badge');;
      t.same(badge.shortname, 'offline-badge');
      t.end();
    });
  });

  test('Badge.getAllClaimCodes', function (t) {
    // we have six codes defined in fixtures, so we want at least that many
    var expect = 6;
    Badge.getAllClaimCodes(function (err, codes) {
      t.ok(codes.length >= expect, 'should have at least six codes');
      t.end();
    });
  });

  test('Badge#generateClaimCodes generates until finished', function (t) {
    function generate(count) {
      var retval = cannedCodes.shift();
      t.equal(retval.length, count,
              "expect generate(" + retval.length + ")");
      return retval;
    }

    var cannedCodes = [
      ['a', 'b', 'c'],
      // Return a duplicate code from before.
      ['d', 'e', 'a'],
      // We'll get called upon to generate one more code b/c of the dup.
      ['f']
    ];

    const badge = validBadge();
    badge.shortname = badge.name = 'gcc-test-badge';
    badge.generateClaimCodes({
      count: 3,
      codeGenerator: generate
    }, function (err, codes) {
      if (err) throw err;
      t.same(codes, ['a', 'b', 'c']);
      t.equal(cannedCodes.length, 2);
      badge.generateClaimCodes({
        count: 3,
        codeGenerator: generate
      }, function(err, codes) {
        if (err) throw err;
        t.same(codes, ['d', 'e', 'f']);
        t.equal(cannedCodes.length, 0);
        t.end();
      });
    });
  });

  test('Badge#generateClaimCodes', function (t) {
    const badge = fixtures['random-badge'];
    const count = 1000;
    badge.generateClaimCodes({count: count}, function (err, codes) {
      t.notOk(err, 'should not have any errors');
      t.same(codes.length, count);
      t.same(badge.claimCodes.length, count);
      t.end();
    });
  });

  test('Badge#removeClaimCode', function (t) {
    const badge = fixtures['offline-badge'];
    badge.removeClaimCode('remove-claim', function(err) {
      if (err) throw err;
      badge.claimCodes.forEach(function (claim) {
        if (claim.code == 'remove-claim')
          t.fail('should have removed');
      });
      t.end();
    });
  });

  test('Badge#awardOrFind: award badge to a user', function (t) {
    var badge = fixtures['link-comment'];
    var email = fixtures['user'].user;
    badge.awardOrFind(email, function (err, instance) {
      t.notOk(err, 'should not have an error');
      t.ok(instance, 'should have a badge instance');
      t.same(instance.user, email, 'should be assigned to the right user');
      t.end();
    });
  });

  test('Badge#reserveAndNotify does nothing when user already has badge', function(t) {
    var badge = fixtures['link-comment'];
    var email = fixtures['user'].user;
    badge.reserveAndNotify(email, function(err, claimCode) {
      if (err) throw err;
      t.same(claimCode, null, "user already has badge");
      t.end();
    });
  });

  test('Badge#reserveAndNotify creates reserved claim code', function(t) {
    var badge = fixtures['random-badge'];
    var email = fixtures['user'].user;
    badge.reserveAndNotify(email, function(err, claimCode) {
      if (err) throw err;
      t.equal(typeof(claimCode), 'string');
      var claim = badge.getClaimCode(claimCode);
      t.equal(claim.reservedFor, email, "reserved claim code is generated");
      t.end();
    });
  });

  test('Badge#reserveAndNotify makes more codes when user has reserved claim code because user might be a guardian with lots of kids', function(t) {
    var badge = fixtures['random-badge'];
    var email = fixtures['user'].user;
    badge.reserveAndNotify(email, function(err, claimCode) {
      if (err) throw err;
      t.equal(typeof(claimCode), 'string');
      var claim = badge.getClaimCode(claimCode);
      t.equal(claim.reservedFor, email, "another reserved claim code is generated because the email might be for a guardian who has multiple kids");
      t.end();
    });
  });

  test("claim codes have a creationDate", function(t) {
    t.ok(fixtures['offline-badge'].claimCodes[0].creationDate instanceof Date);
    t.end();
  });

  test("Badge#getBatchNames", function(t) {
    var badge = validBadge();
    badge.claimCodes.push({
      code: 'a',
      batchName: 'lol'
    });
    badge.claimCodes.push({
      code: 'b',
      batchName: 'lol'
    });
    badge.claimCodes.push({
      code: 'c',
      batchName: 'heh'
    });
    badge.claimCodes.push({
      code: 'd'
    });

    t.same(badge.getBatchNames(), ['lol', 'heh']);

    t.same(badge.getClaimCodes({batchName: 'lol'}), [{
      code: 'a',
      claimed: false,
      batchName: 'lol'
    }, {
      code: 'b',
      claimed: false,
      batchName: 'lol'
    }]);

    t.end();
  });

  test("Badge.find() finds only undeleted badges by default", function(t) {
    Badge.find({shortname: 'deleted-badge'}, function(err, badges) {
      if (err) throw err;
      t.equal(badges.length, 0);
      t.end();
    });
  });

  test("Badge.find() can find deleted badges if needed", function(t) {
    Badge.find({shortname: 'deleted-badge', deleted: true}, function(err, badges) {
      if (err) throw err;
      t.equal(badges.length, 1);
      t.end();
    });
  });

  test("Badge.findOne() finds only undeleted badges by default", function(t) {
    Badge.findOne({shortname: 'deleted-badge'}, function(err, badge) {
      if (err) throw err;
      t.equal(badge, null);
      t.end();
    });
  });

  test("Badge.findOne() can find deleted badges if needed", function(t) {
    Badge.findOne({shortname: 'deleted-badge', deleted: true}, function(err, badge) {
      if (err) throw err;
      t.ok(badge);
      t.end();
    });
  });

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close();
    t.end();
  });
});
