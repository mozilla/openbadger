const BadgeInstance = require('./badge-instance');

const Stats = {};

function isoMonthDay(date) {
  return date.toISOString().slice(0, 7);
}

Stats.monthly = function monthlyStats(callback) {
  const months = {};
  BadgeInstance.find({}, function (err, instances) {
    if (err) return callback(err);
    instances.forEach(function (instance) {
      const month = isoMonthDay(instance.issuedOn);
      months[month] = (months[month] || 0) + 1;
    });
    callback(null, months);
  });
};

module.exports = Stats;