
/*
 * Administrative Pages
 */

exports.index = function (req, res) {
  return res.render('admin/index.html');
};

exports.badge = function (req, res) {
  return res.render('admin/badge.html');
};

exports.badgeIndex = function (req, res) {
  return res.render('admin/badge-index.html', {
    badges: req.badges
  });
};

exports.show = function (req, res) {
  return res.render('admin/show-badge.html', {
    badge: req.badge
  });
};