var Issuer = require('../models/issuer');

exports.update = function update(req, res) {
  var form = req.body;
  var issuer = req.issuer || new Issuer();

  Object.keys(form).forEach(function (key) {
    issuer[key] = form[key];
  });

  issuer.save(function (err, result) {
    if (err)
      return res.send(err);
    req.flash('info', 'Configuration saved');
    res.redirect('/');
  });
};


/**
 * (Middleware) Get issuer configuration.
 */

exports.getIssuerConfig = function () {
  return function (req, res, next) {
    Issuer.findOne(function (err, issuer) {
      // #TODO: log/report this better.
      if (err) {
        err.from = 'getIssuerConfig middleware';
        return res.send(err);
      }
      req.issuer = issuer;
      return next();
    });
  }
};