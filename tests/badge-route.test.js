const test = require('./');
const conmock = require('./conmock');
const badgeFixtures = require('./badge-model.fixtures');

const db = require('../models');
const badge = require('../routes/badge');

test.applyFixtures(badgeFixtures, function(fx) {
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

  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
