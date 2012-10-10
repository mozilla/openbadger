
/*
 * Administrative Pages
 */
exports.index = function (req, res) {
  return res.render('admin/index.html');
};

exports.newBadgeForm = function (req, res) {
  return res.render('admin/new-badge.html');
};

exports.newBehaviorForm = function (req, res) {
  return res.render('admin/new-behavior.html', {
    badgeShortname: req.query['for']
  });
};

exports.badgeIndex = function (req, res) {
  return res.render('admin/badge-index.html', {
    badges: req.badges
  });
};

exports.show = function (req, res) {
  return res.render('admin/show-badge.html', {
    defaultBehavior: req.query['behavior'],
    badge: req.badge,
    behaviors: req.behaviors
  });
};