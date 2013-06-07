const test = require('./');
const conmock = require('./conmock');
const jwt = require('jwt-simple');

const db = require('../models');
const api = require('../routes/api');

test.applyFixtures({}, function(fx) {
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

  test("auth fails when 'auth' param uses wrong jwt secret", function(t) {
    api.jwtSecret = 'lol';
    conmock({
      handler: api.auth(),
      request: {
        body: {auth: 'beans'}
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
      t.equal(req.authIsLimited, false);
      t.end();
    });
  });

  test("auth works when 'auth' param is limited jwt", function(t) {
    api.jwtSecret = 'lol';
    api.limitedJwtSecret = 'lolcats';
    conmock({
      handler: api.auth(),
      request: {
        body: {auth: jwt.encode({}, 'lolcats')}
      }
    }, function(err, mockRes, req) {
      t.equal(mockRes.fntype, 'next');
      t.equal(req.authIsLimited, true);
      t.end();
    });
  });

  test("auth works with GET requests", function(t) {
    api.jwtSecret = 'lol';
    api.limitedJwtSecret = null;
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

  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
