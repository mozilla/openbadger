var nunjucks = require('nunjucks');
var env = (new nunjucks.Environment(
  new nunjucks.FileSystemLoader('views')
));
env.addFilter('undef', function (thing) {
  return thing || '';
});
module.exports = env;