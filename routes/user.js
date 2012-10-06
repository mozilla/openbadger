var env = require('../lib/environment');
var persona = require('../lib/persona');
var util = require('util');

exports.login = function(req, res){
  if (req.method === 'GET')
    return res.render("login.html");
  var assertion = req.body.assertion;
  persona.verify(assertion, function (err, email) {
    if (err)
      return res.send(util.inspect(err));
    if (!userIsAuthorized(email))
      return res.send('not authorized')
    req.session.user = email;
    return res.redirect('/');
  });
};

function userIsAuthorized(email) {
  var admins = env.get('admins');
  return admins.indexOf(email) >= -1;
}