const fs = require('fs');

const test = require('./');
const db = require('../models');
const Badge = require('../models/badge');

var allFixtures = require('./badge-model.fixtures.js');

test.applyFixtures({
  'offline-badge': allFixtures['offline-badge']  
}, function (fixtures) {
  var badge = fixtures['offline-badge'];
  var claim = badge.claimCodes.filter(function(c) {
    return c.code == 'reserved-claim';
  })[0];
  var tempFiles = [
    {
      path: __dirname + '/temp-evidence-0.txt',
      type: 'text/plain',
      _testContent: Date.now().toString()
    },
    {
      path: __dirname + '/temp-evidence-1.html',
      type: 'text/html',
      _testContent: '<p>hi</p>'
    }
  ];

  tempFiles.forEach(function(file) {
    fs.writeFileSync(file.path, file._testContent);
  });

  test('adding evidence works', function(t) {
    Badge.temporaryEvidence.add(claim, tempFiles, function(err) {
      if (err) throw err;
      badge.save(function(err) {
        t.equal(claim.evidence.length, 2);
        t.equal(claim.evidence[0].path, '/reserved-claim/0');
        t.equal(claim.evidence[0].mimeType, 'text/plain');
        t.equal(claim.evidence[1].path, '/reserved-claim/1');
        t.equal(claim.evidence[1].mimeType, 'text/html');
        t.end();
      });
    });
  });

  test('fetching evidence works', function(t) {
    var evidence = claim.evidence[0];
    Badge.temporaryEvidence.getReadStream(evidence, function(err, s) {
      if (err) throw err;
      var chunks = [];
      s.on('data', function(chunk) { chunks.push(chunk); });
      s.on('end', function() {
        var result = Buffer.concat(chunks).toString('ascii');
        t.equal(result, tempFiles[0]._testContent);
        t.end();
      });
    });
  });

  test('destroying evidence works', function(t) {
    Badge.temporaryEvidence.destroy(claim, function(err) {
      if (err) throw err;
      t.equal(claim.evidence.length, 0);
      badge.save(function(err) {
        t.equal(claim.evidence.length, 0);
        t.end();
      });
    });
  });

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    tempFiles.forEach(function(file) {
      fs.unlinkSync(file.path);
    });
    db.close();
    t.end();
  });
});
