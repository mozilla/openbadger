const test = require('./');
const conmock = require('./conmock');
const undo = require('../routes/undo');
const badgeFixtures = require('./badge-model.fixtures');

const db = require('../models');

test.applyFixtures(badgeFixtures, function(fx) {
  test('undo route works w/ nonexistent object IDs', function(t) {
    conmock({
      handler: undo,
      request: {
        params: {undoId: '507f1f77bcf86cd799439011'}
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 404);
      t.end();
    });
  });

  test('undo route works w/ malformed object IDs', function(t) {
    conmock({
      handler: undo,
      request: {
        params: {undoId: 'lol'}
      }
    }, function(err, mockRes, req) {
      if (err) throw err;
      t.equal(mockRes.status, 404);
      t.end();
    });
  });

  test('undo route works', function(t) {
    badgeFixtures['comment'].undoablyDelete(function(err, record) {
      if (err) throw err;

      conmock({
        handler: undo,
        request: {
          params: {undoId: record._id}
        }
      }, function(err, mockRes, req) {
        if (err) throw err;
        t.equal(mockRes.fntype, 'redirect');
        t.equal(mockRes.path, 'back');
        record.constructor.findOne({_id: record._id}, function(err, record) {
          if (err) throw err;
          t.equal(record, null);
          t.end();
        });
      });
    });
  });

  test('undo findAll middleware works', function(t) {
    badgeFixtures['link-basic'].undoablyDelete(function(err, record) {
      if (err) throw err;
      conmock({
        handler: undo.findAll,
        request: {
        }
      }, function(err, mockRes, req) {
        if (err) throw err;
        t.equal(req.undoRecords.length, 1);
        t.same(req.undoRecords[0]._id.toString(), record._id.toString());
        t.end();
      });
    });
  });

  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
