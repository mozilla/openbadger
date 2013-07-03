const util = require('util');
const fs = require('fs');
const test = require('./');
const conmock = require('./conmock');
const badgeFixtures = require('./badge-model.fixtures');

const db = require('../models');
const badge = require('../routes/badge');

const Badge = require('../models/badge');
const Work = require('../models/work');

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

  test('getting open claim codes as txt w/ batchName works', function(t) {
    conmock({
      handler: badge.getUnclaimedCodesTxt,
      request: {
        badge: fx['offline-badge'],
        query: {batchName: 'LOLOL'}
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.headers['Content-Type'], 'text/plain');
      t.equal(mockRes.body, '');
      t.end();
    });
  });

  test('invalid bulk action returns 400', function(t) {
    conmock({
      handler: badge.bulkClaimCodeAction,
      request: {
        badge: fx['offline-badge'],
        body: {action: 'LOLOL'}
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 400);
      t.end();
    });
  });

  test('txt bulk action returns redirect', function(t) {
    conmock({
      handler: badge.bulkClaimCodeAction,
      request: {
        badge: fx['offline-badge'],
        body: {action: 'txt', batchName: 'foo bar'}
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 303);
      t.equal(mockRes.path, '../unclaimed.txt?batchName=foo%20bar');
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

  test('reserving a badge w/ evidence works', function(t) {
    var badgeModel = fx['no-image-badge'];
    var content = Date.now().toString();
    var path = __dirname + '/temp-evidence.txt';

    fs.writeFileSync(path, content);
    t.equal(badgeModel.claimCodes.length, 0);
    conmock({
      handler: badge.issueOneWithEvidence,
      request: {
        badge: badgeModel,
        body: {
          email: 'blarg@goose.org '
        },
        files: {
          evidence: {
            path: path,
            type: 'text/plain'
          }
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      fs.unlinkSync(path);
      t.equal(badgeModel.claimCodes.length, 1);
      var claim = badgeModel.claimCodes[0];
      t.equal(claim.reservedFor, 'blarg@goose.org');
      t.equal(claim.evidence.length, 1);
      var evidence = claim.evidence[0];
      t.equal(evidence.mimeType, 'text/plain');
      Badge.temporaryEvidence.getReadStream(evidence, function(err, s) {
        if (err) throw err;
        var chunks = [];
        s.on('data', function(c) { chunks.push(c); });
        s.on('end', function() {
          t.equal(Buffer.concat(chunks).toString('ascii'), content);
          Badge.temporaryEvidence.destroy(claim, function(err) {
            if (err) throw err;
            t.end();
          });
        });
      });
    });
  });

  test('reserving a badge w/ evidence array works', function(t) {
    var badgeModel = fx['link-comment'];
    var path = __dirname + '/temp-evidence.txt';

    fs.writeFileSync(path, 'blah');
    t.equal(badgeModel.claimCodes.length, 0);
    conmock({
      handler: badge.issueOneWithEvidence,
      request: {
        badge: badgeModel,
        body: {
          email: 'blarg@goose.org'
        },
        files: {
          evidence: [{
            path: path,
            type: 'text/plain'
          }]
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      fs.unlinkSync(path);
      t.equal(badgeModel.claimCodes.length, 1);
      var claim = badgeModel.claimCodes[0];
      t.equal(claim.reservedFor, 'blarg@goose.org');
      t.equal(claim.evidence.length, 1);
      var evidence = claim.evidence[0];
      t.equal(evidence.mimeType, 'text/plain');
      Badge.temporaryEvidence.destroy(claim, function(err) {
        if (err) throw err;
        t.end();
      });
    });
  });

  test('reserving a badge w/o evidence works', function(t) {
    var badgeModel = fx['science-math1'];

    t.equal(badgeModel.claimCodes.length, 0);
    conmock({
      handler: badge.issueOneWithEvidence,
      request: {
        badge: badgeModel,
        body: {
          email: 'blarg@goose.org'
        },
        files: {}
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(badgeModel.claimCodes.length, 1);
      var claim = badgeModel.claimCodes[0];
      t.equal(claim.reservedFor, 'blarg@goose.org');
      t.equal(claim.evidence.length, 0);
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
          emails: ['blarg@goose.org','narg@moose.org'].join('\n')
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.fntype, 'redirect');
      t.equal(mockRes.status, 303);
      t.equal(mockRes.path, 'back');
      t.equal(flashes.length, 1);
      t.same(mockRes.nextErr, undefined);
      if (!flashes.length) {
        // The rest of this test assumes flashes[0] exists; if it doesn't,
        // though, we need to return now, or else a "blah is not a property
        // of undefined" type error will get thrown, which is completely
        // unrelated to the actual problem.
        return t.end();
      }

      t.equal(flashes[0].type, 'results');
      t.equal(flashes[0].results.length, 2);
      var success = flashes[0].results[0];
      var success2 = flashes[0].results[1];
      t.equal(success.data.email, 'blarg@goose.org');
      t.equal(success.status, 'waiting');
      t.equal(success2.data.email, 'narg@moose.org');
      t.equal(success2.status, 'waiting');

      Work.processIssueQueue(function (err, results) {
        t.equal(typeof(results[0].claimCode), 'string');
        t.equal(typeof(results[1].claimCode), 'string');
        t.end();
      });

    });
  });

  test('removing claim codes works', function(t) {
    var badgeModel = fx['no-image-badge']
    conmock({
      handler: badge.removeClaimCode,
      request: {
        badge: badgeModel,
        params: {code: badgeModel.claimCodes[0].code}
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.fntype, 'redirect');
      t.equal(mockRes.path, 'back');
      t.equal(badgeModel.claimCodes.length, 0);
      t.end();
    });
  });

  test('destroying badges works', function(t) {
    var badgeModel = fx['no-image-badge'];
    t.plan(7);
    t.equal(badgeModel.deleted, false);
    conmock({
      handler: badge.destroy,
      request: {
        badge: badgeModel,
        flash: function(category, args) {
          t.equal(category, "info");
          t.equal(args.info.name, "Badge \"Program with no image\"");
          t.ok(args.info.id);
        }
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.body, 'Badge undoably deleted.');
      t.equal(badgeModel.deleted, true);
      t.end();
    });
  });

  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
