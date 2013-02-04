const Stats = require('../models/stats');

exports.monthly = function monthly(req, res, next) {
  Stats.monthly(function (err, stats) {
    if (err) return next(err);
    const months = Object.keys(stats).map(function (month) {
      return { month: month, count: stats[month] };
    }).reverse();
    req.stats = months;
    return next();
  });
};