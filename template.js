var nunjucks = require('nunjucks');
var env = (new nunjucks.Environment(
  new nunjucks.FileSystemLoader('views')
));
env.addFilter('undef', function (thing) {
  return thing || '';
});
env.addFilter('activize', function (actual, expect) {
  if (expect === actual)
    return 'class="active"';
  return '';
});
env.addFilter('stupidSafe', function (html) {
  return (
    html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  );
});
module.exports = env;