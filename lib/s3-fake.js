var fs = require('fs');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

function mkPath(abspath) {
  var parts = abspath.split(path.sep).slice(1);
  var currPath = path.sep;

  for (var i = 0; i < parts.length; i++) {
    currPath += parts[i];
    if (!fs.existsSync(currPath))
      fs.mkdirSync(currPath);
    currPath += '/';
  }
}

function FakeS3(rootDir) {
  if (!rootDir)
    rootDir = path.join(__dirname, 's3-fake-storage');
  this.rootDir = path.resolve(rootDir);
}

FakeS3.prototype._toFilePath = function(urlPath) {
  var pathParts = urlPath.split('/').slice(1);
  return path.join(this.rootDir, pathParts.join(path.sep));
};

FakeS3.prototype.putFile = function(filePath, urlPath, headers, cb) {
  return this.putBuffer(fs.readFileSync(filePath), urlPath, headers, cb);
};

// Headers only contain Content-Type, which is same as the path
// extension we're provided by our own code, so don't worry about it.
FakeS3.prototype.putBuffer = function(buffer, urlPath, headers, cb) {
  var abspath = this._toFilePath(urlPath);
  mkPath(path.dirname(abspath));
  fs.writeFileSync(abspath, buffer);

  process.nextTick(function() {
    // We don't currently do anything w/ the data, so we won't bother
    // passing it in as the second param to the callback.
    cb(null);
  });
};

FakeS3.prototype.get = function(urlPath) {
  var abspath = this._toFilePath(urlPath);
  var result = new EventEmitter();

  result.end = function() {
    process.nextTick(function() {
      result.emit('response', fs.createReadStream(abspath));
    });
  };
  
  return result;
};

FakeS3.prototype.deleteFile = function(urlPath, cb) {
  var abspath = this._toFilePath(urlPath);

  if (fs.existsSync(abspath))
    fs.unlinkSync(abspath);

  process.nextTick(function() {
    // We don't currently do anything w/ the response, so we won't bother
    // passing it in as the second param to the callback.
    cb(null);
  });
};

module.exports = FakeS3;
