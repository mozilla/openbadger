const test = require('./');
const conmock = require('./conmock');
const badgeFixtures = require('./badge-model.fixtures');
const jwt = require('jwt-simple');

const Badge = require('../models/badge');
const db = require('../models');
const api = require('../routes/api');

test.applyFixtures(badgeFixtures, function(fx) {
  test("auth fails when no jwt secret is configured", function(t) {
    api.jwtSecret = null;
    conmock({
      handler: api.auth(),
      request: {
        body: {auth: 'lol'}
      }
    }, function(err, mockRes, req) {
      t.equal(mockRes.status, 403);
      t.equal(mockRes.body.reason, "issuer has not configured jwt secret");
      t.end();
    });
  });

  test("auth fails when no 'auth' param is present", function(t) {
    conmock({
      handler: api.auth(),
      request: {
        body: {}
      }
    }, function(err, mockRes, req) {
      t.equal(mockRes.status, 403);
      t.equal(mockRes.body.reason, "missing mandatory `auth` param");
      t.end();
    });
  });

  test("auth fails when 'auth' param isn't a jwt", function(t) {
    api.jwtSecret = 'lol';
    conmock({
      handler: api.auth(),
      request: {
        body: {auth: 'lol'}
      }
    }, function(err, mockRes, req) {
      t.equal(mockRes.status, 403);
      t.ok(mockRes.body.reason.match(/^error decoding JWT/));
      t.end();
    });
  });

  test("auth works when 'auth' param is a jwt", function(t) {
    api.jwtSecret = 'lol';
    conmock({
      handler: api.auth(),
      request: {
        body: {auth: jwt.encode({}, 'lol')}
      }
    }, function(err, mockRes, req) {
      t.equal(mockRes.fntype, 'next');
      t.end();
    });
  });

  test("auth works with GET requests", function(t) {
    api.jwtSecret = 'lol';
    conmock({
      handler: api.auth(),
      request: {
        method: "GET",
        query: {auth: jwt.encode({}, 'lol')}
      }
    }, function(err, mockRes, req) {
      t.equal(mockRes.fntype, 'next');
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

  test('api rejects used claim codes', function(t) {
    conmock({
      handler: api.awardBadgeFromClaimCode,
      request: {
        body: {
          email: 'foo@bar.org',
          code: 'already-claimed'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 409);
      t.same(mockRes.body, {
        status: 'error',
        reason: "claim code `already-claimed` has already been used",
        code: 'already-claimed'
      });
      t.end();
    });
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

  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
