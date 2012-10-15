var Issuer = require('../models/issuer');

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