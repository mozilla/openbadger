var path = require('path');
var markdown = require('markdown').markdown;
var nunjucks = require('nunjucks');
var util = require('util');

exports.buildEnvironment = function buildEnvironment(options) {
  var themeDir = options.themeDir;
  var staticMiddleware = options.staticMiddleware;
  var paths = [__dirname + '/views'];

  if (themeDir) paths.splice(0, 0, path.join(themeDir, 'views'));

  var loaders = paths.map(function(path) {
    return new nunjucks.FileSystemLoader(path);
  });
  var env = new nunjucks.Environment(loaders);

  env.express = function(app) {
    nunjucks.Environment.prototype.express.apply(this, arguments);
    app.use(staticMiddleware(path.join(__dirname, 'public')));
    if (themeDir) {
      var staticDir = path.join(themeDir, 'public');
      app.locals.THEME_ROOT = '/theme';
      app.use('/theme/', staticMiddleware(staticDir));
    }
  };

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
  env.addFilter('list', function (list, prop, sep) {
    return list.map(util.prop(prop)).join(sep);
  });

  env.addFilter('userHome', function (access) {
    return {
      super: '/admin',
      issuer: '/issuer'
    }[access];
  });

  return env;
};
