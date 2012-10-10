
/*
 * GET home page.
 */

exports.index = function index(req, res) {
  console.dir(req.session);
  res.render('index.html');
};