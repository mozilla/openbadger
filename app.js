var express = require('express');
var http = require('http');
var path = require('path');
var nunjucks = require('nunjucks');
var util = require('util');

var middleware = require('./middleware');
var routes = require('./routes');
var user = require('./routes/user');

var app = express();
var logger = app.logger = require('./lib/logger');
var env = app.env = require('./lib/environment');

logger.info('Environment: \n' + util.inspect(env.all()));

(new nunjucks.Environment(
  new nunjucks.FileSystemLoader('views')
)).express(app);

app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(middleware.cookieParser());
  app.use(middleware.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/login', user.login);
app.post('/login', user.login);

module.exports = app;

if (!module.parent) {
  http.createServer(app).listen(app.get('port'), function() {
    logger.info("Express server listening on port " + app.get('port'));
  });
}
