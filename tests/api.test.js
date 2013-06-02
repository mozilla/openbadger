const test = require('./');
const conmock = require('./conmock');
const badgeFixtures = require('./badge-model.fixtures');
const util = require('../lib/util');

const Badge = require('../models/badge');
const db = require('../models');
const api = require('../routes/api');
const env = require('../lib/environment');

function ensureAlreadyClaimedError(t) {
  return function(err, mockRes, req) {
    if (err) throw err;
    t.equal(mockRes.status, 409);
    t.same(mockRes.body, {
      status: 'error',
      reason: "claim code `already-claimed` has already been used",
      code: 'already-claimed'
    });
    t.end();
  };
}

test.applyFixtures(badgeFixtures, function(fx) {
  test('api provides user info', function(t) {
    conmock({
      handler: api.user,
      request: {
        query: {
          email: 'brian@example.org'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      var badge = mockRes.body.badges['link-basic'];
      t.equal(mockRes.status, 200);
      t.equal(mockRes.body.status, 'ok');
      t.equal(typeof(badge.issuedOn), 'number');
      t.equal(typeof(badge.isRead), 'boolean');
      t.equal(typeof(badge.assertionUrl), 'string');
      t.end();
    });
  });

  test('api returns 404 when no user badge info', function(t) {
    conmock({
      handler: api.userBadge,
      request: {
        query: {
          email: 'brian@example.org'
        },
        params: {
          shortname: 'LOLOLOL'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 404);
      t.end();
    });
  });

  test('api provides user badge info', function(t) {
    conmock({
      handler: api.userBadge,
      request: {
        query: {
          email: 'brian@example.org'
        },
        params: {
          shortname: 'link-basic'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      var badge = mockRes.body.badge;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.body.status, 'ok');
      t.equal(typeof(badge.issuedOn), 'number');
      t.equal(typeof(badge.isRead), 'boolean');
      t.equal(typeof(badge.assertionUrl), 'string');
      t.equal(badge.badgeClass.program.name, "Some Program");
      t.equal(badge.badgeClass.program.issuer.name, "Badge Authority");
      t.equal(badge.badgeClass.name, 'Link Badge, basic');
       t.end();
    });
  });

  test('api provides expected badge info', function(t) {
    env.temp({origin: 'https://example.org'}, function(done) {
      conmock({
        handler: api.badge,
        request: {
          badge: fx['with-criteria']
        }
      }, function(err, mockRes, req) {
        if (err) throw err;
        t.equal(mockRes.status, 200);
        t.same(JSON.parse(JSON.stringify(mockRes.body)), {
          status: 'ok',
          badge: {
            "name":"Badge with criteria",
            "description":"For doing random stuff",
            "criteria": "* person is awesome",
            "prerequisites": [],
            "tags": [],
            "program": {
              shortname: "some-program",
              name: "Some Program",
              issuer: {
                name: "Badge Authority",
                url: "http://badgeauthority.org"
              },
              url: "http://example.org/program",
              imageUrl: "https://example.org/program/image/program"
            },
            "image":"https://example.org/badge/image/with-criteria.png",
            "ageRange": [],
            "categories": [],
            "rubric":{
              "items":[{"text":"person is awesome","required":true}]
            }
          }
        });
        t.end();
        done();
      });
    });
  });

  test('api provides unclaimed badge info given claim code', function(t) {
    conmock({
      handler: api.getUnclaimedBadgeInfoFromCode,
      request: {
        query: {
          code: 'will-claim'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.body.status, 'ok');
      t.equal(mockRes.body.badge.name, 'Offline badge');
      t.end();
    });
  });

  test('api awards badges w/ claim codes', function(t) {
    conmock({
      handler: api.awardBadgeFromClaimCode,
      request: {
        body: {
          email: 'foo@bar.org',
          code: 'will-claim'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.body.status, 'ok');
      t.ok('url' in mockRes.body);
      Badge.findOne({_id: fx['offline-badge']._id}, function(err, badge) {
        if (err) throw err;
        t.ok(badge);
        t.same(badge.getClaimCode('will-claim').claimedBy, 'foo@bar.org');
        t.end();
      });
    });
  });

  test('api rejects unused claim codes for pre-earned badges', function(t) {
    conmock({
      handler: api.awardBadgeFromClaimCode,
      request: {
        body: {
          email: 'foo@bar.org',
          code: 'never-claim'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 409);
      t.equal(mockRes.body.status, 'error');
      t.equal(mockRes.body.reason, 'user `foo@bar.org` already has badge');
      Badge.findOne({_id: fx['offline-badge']._id}, function(err, badge) {
        if (err) throw err;
        t.ok(badge);
        t.equal(badge.getClaimCode('never-claim').claimedBy, undefined,
                "claim code should not be used up");
        t.end();
      });
    });
  });

  test('api POST rejects used claim codes', function(t) {
    conmock({
      handler: api.awardBadgeFromClaimCode,
      request: {
        body: {
          email: 'foo@bar.org',
          code: 'already-claimed'
        }
      }
    }, ensureAlreadyClaimedError(t));
  });

  test('api GET rejects used claim codes', function(t) {
    conmock({
      handler: api.getUnclaimedBadgeInfoFromCode,
      request: {
        query: {
          code: 'already-claimed'
        }
      }
    }, ensureAlreadyClaimedError(t));
  });

  test('api rejects unknown claim codes', function(t) {
    conmock({
      handler: api.awardBadgeFromClaimCode,
      request: {
        body: {
          email: 'foo@bar.org',
          code: 'lololol'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 404);
      t.same(mockRes.body, {
        status: 'error',
        reason: "unknown claim code",
        code: 'lololol'
      });
      t.end();
    });
  });

  test('api rejects claim code redemption w/o code', function(t) {
    conmock({
      handler: api.awardBadgeFromClaimCode,
      request: {
        body: {
          email: 'foo@bar.org'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 400);
      t.same(mockRes.body, {
        status: 'error',
        reason: "missing claim code",
      });
      t.end();
    });
  });

  test('api rejects claim code redemption w/o email', function(t) {
    conmock({
      handler: api.awardBadgeFromClaimCode,
      request: {
        body: {
          code: 'already-claimed'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 400);
      t.same(mockRes.body, {
        status: 'error',
        reason: "missing email address",
      });
      t.end();
    });
  });

  test('api provides program info w/ earnable badges', function(t) {
    conmock({
      handler: api.program,
      request: {
        params: {
          programShortName: 'some-program'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.body.status, 'ok');
      t.equal(mockRes.body.program.name, "Some Program");
      var program = mockRes.body.program;
      t.ok('offline-badge' in program.earnableBadges);
      t.equal(program.earnableBadges['offline-badge'].name, 'Offline badge');
      t.same(program.issuer, {
        name: "Badge Authority",
        url: "http://badgeauthority.org"
      });
      t.end();
    });
  });

  test('api can give badge recommendations', function(t) {
    conmock({
      handler: api.similarBadges,
      request: {
        badge: fx['science1']
      }
    }, function(err, mockRes, req) {
      const badges = mockRes.body.badges;
      t.ok(badges.length > 1, 'should have at least one badge');
      t.ok(badges.every(function (b) {
        return b.name.indexOf('science') == 0;
      }), 'all badges should start with science');
      t.end();
    });
  });

  test('api can give badge recommendations with a limit', function(t) {
    conmock({
      handler: api.similarBadges,
      request: {
        badge: fx['science1'],
        query: { limit: '2' },
      }
    }, function(err, mockRes, req) {
      const badges = mockRes.body.badges;
      t.ok(badges.length == 2, 'should have exactly two badges');
      t.end();
    });
  });

  test('**badge recommendation stub**', function (t) {
    conmock({
      handler: api.badgeRecommendations,
      request: {}
    }, function(err, mockRes, req) {
      t.ok(mockRes.body.badges.length);
      t.end();
    });
  });


  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
