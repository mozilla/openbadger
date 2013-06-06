const util = require('util');
const test = require('./');
const conmock = require('./conmock');
const badgeFixtures = require('./badge-model.fixtures');

const db = require('../models');
const badge = require('../routes/badge');

test.applyFixtures(badgeFixtures, function(fx) {
  test('getting open claim codes as txt works', function(t) {
    conmock({
      handler: badge.getUnclaimedCodesTxt,
      request: {
        badge: fx['offline-badge'],
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.headers['Content-Type'], 'text/plain');
      t.equal(mockRes.body, 'never-claim\nwill-claim\nremove-claim');
      t.end();
    });
  });

  test('adding no claim codes does nothing', function(t) {
    var b = fx['link-basic'];
    t.equal(b.claimCodes.length, 0);
    conmock({
      handler: badge.addClaimCodes,
      request: {
        badge: b,
        body: {
          quantity: 'lol',
          multi: 'on'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 301);
      t.equal(b.claimCodes.length, 0);
      t.end();
    });
  });

  test('adding claim codes works w/ quantity', function(t) {
    var b = fx['link-basic'];
    t.equal(b.claimCodes.length, 0);
    conmock({
      handler: badge.addClaimCodes,
      request: {
        badge: b,
        body: {
          quantity: '3',
          batchName: 'foo'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 301);
      t.equal(b.claimCodes.length, 3);
      t.equal(b.getClaimCodes({batchName: 'foo'}).length, 3);
      t.end();
    });
  });

  test('adding claim codes works w/ codes', function(t) {
    var b = fx['comment'];
    conmock({
      handler: badge.addClaimCodes,
      request: {
        badge: b,
        body: {
          codes: 'blarg\nflarg\n\n\narg',
          batchName: 'meh'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 301);
      t.same(b.claimCodes.map(util.prop('code')), ['blarg', 'flarg', 'arg']);
      t.equal(b.getClaimCodes({batchName: 'meh'}).length, 3);
      t.end();
    });
  });

  test('assertion route finds badge instances by id', function(t) {
    conmock({
      handler: badge.assertion,
      request: {
        params: {hash: fx['instance']._id}
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.headers['Content-Type'], 'application/json');
      t.same(mockRes.body.recipient.type, "email");
      t.end();
    });
  });

  test('badge update route works w/ string ageRange', function(t) {
    conmock({
      handler: badge.update,
      request: {
        badge: fx['comment'],
        body: {
          name: "LOL",
          description: "OOF",
          ageRange: '13-18'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 301);
      t.same(fx['comment'].ageRange.toObject(), ['13-18']);
      t.end();
    });
  });

  test('badge update route works w/ no ageRange', function(t) {
    conmock({
      handler: badge.update,
      request: {
        badge: fx['comment'],
        body: {
          name: "LOL",
          description: "OOF"
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 301);
      t.same(fx['comment'].ageRange, undefined);
      t.end();
    });
  });

  test('badge update route works w/ array ageRange', function(t) {
    conmock({
      handler: badge.update,
      request: {
        badge: fx['comment'],
        body: {
          name: "LOL",
          description: "OOF",
          ageRange: ['13-18', '19-24']
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 301);
      t.same(fx['comment'].ageRange.toObject(), ['13-18', '19-24']);
      t.end();
    });
  });

  test('badge create route handles validation errors', function(t) {
    conmock({
      handler: badge.create,
      request: {
        body: {
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 422);
      t.same(mockRes.body, 
             "A validation error occurred on the following fields: " +
             "description (required), image (required), " +
             "name (required), shortname (required).");
      t.end();
    });
  });

  test('badge update route handles validation errors', function(t) {
    conmock({
      handler: badge.update,
      request: {
        badge: fx['link-basic'],
        imageBuffer: new Buffer(500000),
        body: {
          name: "LOL",
          description: "OOF"
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 422);
      t.same(mockRes.body, 
             "A validation error occurred on the following fields: " +
             "image (maxLength).");
      t.end();
    });
  });

  test('reserving badges for users works', function(t) {
    var flashes = [];
    conmock({
      handler: badge.issueMany,
      request: {
        badge: fx['link-advanced'],
        flash: function(type, results) {
          flashes.push({type: type, results: results});
        },
        body: {
          emails: 'blarg@goose.org\nnarg@moose.org'
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 303);
      t.equal(mockRes.path, 'back');
      t.equal(flashes.length, 1);
      t.ok(flashes[0]);
      t.equal(flashes[0].type, 'results');
      t.equal(flashes[0].results.length, 2);
      var success = flashes[0].results[0];
      var success2 = flashes[0].results[1];
      t.equal(success.email, 'blarg@goose.org');
      t.equal(success.status, 'ok');
      t.equal(typeof(success.claimCode), 'string');
      t.equal(success2.email, 'narg@moose.org');
      t.equal(success2.status, 'ok');
      t.equal(typeof(success2.claimCode), 'string');      
      t.end();
    });
  });

  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
