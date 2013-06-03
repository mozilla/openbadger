// TODO: Separate this module out into its own npm module/git repo.

var async = require('async');

const HEALTH_CHECK_TIMEOUT = 2000;

function checker(fn) {
  return function check(cb) {
    var timeout = setTimeout(function() {
      timeout = null;
      cb(null, {status: "FAILED", reason: "TIMEOUT"});
    }, HEALTH_CHECK_TIMEOUT);

    try {
      fn(function(err) {
        if (timeout === null) return;
        clearTimeout(timeout);
        timeout = null;
        if (err)
          return cb(null, {status: "FAILED", reason: err.toString()});
        cb(null, {status: "OK"});
      });
    } catch (e) {
      clearTimeout(timeout);
      timeout = null;
      cb(null, {status: "FAILED", reason: e.toString()});
    }
  };
}

function sessionStorageChecker(sessionStore) {
  return checker(function checkSessionStorage(cb) {
    var randomNumber = Math.floor(Math.random() * 10000000);
    var sid = "healthCheck_sessionStorage_" + randomNumber;
    var session = {
      n: randomNumber,
      cookie: {maxAge: 3600}
    };

    async.series([
      sessionStore.set.bind(sessionStore, sid, session),
      function(cb) {
        sessionStore.get(sid, function(err, val) {
          if (err) return cb(err);
          if (!(val && val.n == randomNumber))
            return cb(new Error("session store read/write failure"));
          cb();
        });
      },
      sessionStore.destroy.bind(sessionStore, sid)
    ], cb);
  });
}

function runChecks(checks, cb) {
  async.parallel(checks, function(err, results) {
    if (err !== null)
      // This should never happen b/c checkers should catch all errors.
      return cb({
        status: "FAILED",
        reason: "a checker threw an error: " + err
      });

    Object.keys(results).forEach(function(checkName) {
      if (results[checkName].status != "OK")
        results.status = "FAILED";
    });
    if (results.status != "FAILED")
      results.status = "OK";
    cb(results);
  });
}

module.exports = function healthCheck(options) {
  var authenticate = options.auth || function(req, res, next) { next(); };
  var checks = options.checks;

  var healthChecker = function healthChecker(req, res, next) {
    if (req.query['elb'] == 'true')
      return res.send(200, {status: "OK"});

    authenticate(req, res, function(err) {
      if (err) return next(err);

      runChecks(checks, function(results) {
        var statusCode = results.status == "OK" ? 200 : 500;
        return res.json(statusCode, results);        
      });
    });
  };
  healthChecker.runChecks = runChecks.bind(null, checks);
  return healthChecker;
};

module.exports.runChecks = runChecks;
module.exports.sessionStorageChecker = sessionStorageChecker;
module.exports.checker = checker;
