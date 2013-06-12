var path = require('path');
var fs = require('fs');
var test = require('tap').test;

var FakeS3 = require('../lib/s3-fake');

const FAKE_S3_DIR = path.join(__dirname, 's3-fake-storage-test');

function removeFakeS3Dir(t) {
  var root = FAKE_S3_DIR;
  var pathParts = ['', 'evidence'];

  for (var i = pathParts.length; i > 0; i--) {
    var relpath = pathParts.slice(0, i).join(path.sep);
    var abspath = path.join(FAKE_S3_DIR, relpath);
    if (t) t.ok(fs.existsSync(abspath), 'path ' + abspath + ' exists');
    if (fs.existsSync(abspath)) {
      var stat = fs.statSync(abspath);
      stat.isDirectory() ? fs.rmdirSync(abspath) : fs.unlinkSync(abspath);
    }
  };
}

test('FakeS3 works', function(t) {
  var s3 = new FakeS3(FAKE_S3_DIR);

  removeFakeS3Dir();
  s3.putBuffer(new Buffer('hai2u', 'binary'), '/evidence/lol.txt', {
    'Content-Type': 'text/plain'
  }, function(err) {
    t.equal(err, null);
    s3.get('/evidence/lol.txt').on('response', function(proxy) {
      var chunks = [];
      proxy.on('data', function(chunk) {
        chunks.push(chunk);
      });
      proxy.on('end', function() {
        var buf = Buffer.concat(chunks);
        t.equal(buf.toString('ascii'), 'hai2u');
        s3.deleteFile('/evidence/lol.txt', function(err) {
          t.equal(err, null);
          removeFakeS3Dir(t);
          t.end();
        });
      });
    }).end();
  });
});
