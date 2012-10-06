var app = require('../app');
var persona = require('../lib/persona');
exports.login = function(req, res){
  if (req.method === 'GET')
    return res.render("login.html");

  var assertion = req.body.assertion;
  persona.verify(assertion, function (err, email) {
    if (err)
      return res.send(err);

    req.session.user = email;
    return res.redirect('/');
  });
};