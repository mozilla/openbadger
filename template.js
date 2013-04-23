var markdown = require('markdown').markdown;
var nunjucks = require('nunjucks');
var util = require('util');
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
env.addFilter('markdown', function (string) {
  return markdown.toHTML(string);
});
env.addFilter('imageForBadge', function (badge) {
  if (!badge || !badge.relativeUrl)
    return '';
  return util.format(
    '<img src="%s" style="float: right">',
    badge.relativeUrl('image'));
});

env.addFilter('stupidSafe', function (html) {
  return (
    html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  );
});
module.exports = env;
