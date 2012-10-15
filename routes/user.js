var env = require('../lib/environment');
var persona = require('../lib/persona');
var util = require('util');

exports.login = function login(req, res) {
  var path = req.query['path'] || req.body['path'] || '/admin';
  var assertion = req.body.assertion;
  persona.verify(assertion, function (err, email) {
    if (err)
      return res.send(util.inspect(err));
    if (!userIsAuthorized(email))
      return res.send(403, 'not authorized');
    req.session.user = email;
    return res.redirect(path);
  });
};

exports.logout = function logout(req, res) {
  req.session.destroy(function () {
    return res.redirect('/login');
  });
};

exports.requireAuth = function requireAuth(options) {
  var whitelist = (options.whitelist || []).map(function (entry) {
    entry = entry.replace('*', '.*?');
    return RegExp('^' + entry + '$');
  });
  function isExempt(path) {
    var i = whitelist.length;
    while (i--) {
      if (whitelist[i].test(path))
        return true;
    }
    return false;
  }
  return function (req, res, next) {
    var path = req.path;
    var user = req.session.user;
    if (isExempt(path))
      return next();
    if (!user || !userIsAuthorized(user))
      return res.redirect(options.redirectTo + '?path=' + path);
    return next();
  };
};

function userIsAuthorized(email) {
  var admins = env.get('admins');
  var authorized = false;
  admins.forEach(function (admin) {
    if (authorized) return;
    var adminRe = new RegExp(admin.replace('*', '.+?'));
    if (adminRe.test(email))
      return (authorized = true);
  });
  return authorized;
}