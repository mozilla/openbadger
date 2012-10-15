var nunjucks = require('nunjucks');
var env = (new nunjucks.Environment(
  new nunjucks.FileSystemLoader('views')
));
module.exports = env;