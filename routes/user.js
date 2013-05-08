var BadgeInstance = require('../models/badge-instance.js');
var env = require('../lib/environment');
var persona = require('../lib/persona');
var util = require('util');

exports.login = function login(req, res) {
  var path = req.query['path'] || req.body['path'] || '/admin';
  var assertion = req.body.assertion;
  persona.verify(assertion, function (err, email) {
    if (err)
      return res.send(util.inspect(err));
    if (!env.isAdmin(email))
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

exports.deleteInstancesByEmail = function deleteInstancesByEmail(req, res, next) {
  var form = req.body;
  var email = form.email;
  BadgeInstance.deleteAllByUser(email, function (err, instances) {
    if (err) return next(err);
    return res.redirect('back');
  });
};

exports.requireAuth = function requireAuth(options) {
  var whitelist = (options.whitelist || []).map(function (entry) {
    if (typeof entry === 'string') {
      entry = entry.replace('*', '.*?');
      return RegExp('^' + entry + '$');
    }
    return entry;
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
    if (!user || !env.isAdmin(user))
      return res.redirect(options.redirectTo + '?path=' + path);
    return next();
  };
};

function getElem(key) {
  return function (obj) { return obj[key] };
}

exports.findAll = function findAll(options) {
  return function (req, res, next) {
    BadgeInstance.find(function (err, instances) {
      if (err) return next(err);
      var users = instances.reduce(function (users, instance) {
        var user = users[instance.user];
        if (user)
          user.push(instance)
        else
          users[instance.user] = [instance];
        return users;
      }, {});
      req.users = Object.keys(users).map(function (email) {
        var instances = users[email];
        return {
          email: email,
          badges: instances.map(getElem('badge'))
        };
      });
      return next();
    });
  };
};
