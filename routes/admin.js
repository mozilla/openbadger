
/*
 * Administrative Pages
 */

exports.badge = function(req, res){
  res.render('admin/badge.html', {'projectName':'ClopenBadger'});
};