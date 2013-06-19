const test = require('./');
const conmock = require('./conmock');
const badgeFixtures = require('./badge-model.fixtures');

const db = require('../models');
const issuer = require('../routes/issuer');

test.applyFixtures(badgeFixtures, function(fx) {
  test('destroying issuers works', function(t) {
    var issuerModel = fx['issuer'];
    t.equal(issuerModel.deleted, false);
    conmock({
      handler: issuer.destroy,
      request: {
        issuer: issuerModel
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.body, 'Issuer undoably deleted.');
      t.equal(issuerModel.deleted, true);
      t.end();
    });    
  });

  test('destroying programs works', function(t) {
    var programModel = fx['no-image-program'];
    t.equal(programModel.deleted, false);
    conmock({
      handler: issuer.destroyProgram,
      request: {
        program: programModel
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 200);
      t.equal(mockRes.body, 'Program undoably deleted.');
      t.equal(programModel.deleted, true);
      t.end();
    });    
  });

  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
