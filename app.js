var express = require('express');
var http = require('http');
var util = require('util');

var middleware = require('./middleware');
var template = require('./template');
var routes = require('./routes');
var render = require('./routes/render');
var debug = require('./routes/debug');
var api = require('./routes/api');

var app = express();
var logger = app.logger = require('./lib/logger');
var env = app.env = require('./lib/environment');
var templateEnv = template.buildEnvironment({
  themeDir: process.env.THEME_DIR,
  staticMiddleware: express.static
});

templateEnv.express(app);

api.jwtSecret = env.get('jwt_secret');

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon(__dirname + '/public/img/favicon.ico'));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(middleware.cookieParser());
  app.use(middleware.session());
  app.use(middleware.flash());

  routes.applyMiddleware(app, middleware);

  app.use(app.router);

  // if we've fallen through the router, it's a 404
  app.use(render.notFound);
});

app.configure('development', function () {
  app.get('/500', render.nextError);
  app.use(express.errorHandler());
});

app.configure('production', function () {
  app.use(render.errorHandler);
});

routes.define(app);

// Debug endpoints
// ---------------
app.configure('development', function () {
  app.get('/debug/flush', render.showFlushDbForm);
  app.post('/debug/flush', debug.flushDb);
  app.get('/debug/token', debug.generateToken);
  app.post('/debug/token', debug.generateToken);
});

var server = module.exports = http.createServer(app);

console.log('Environment: \n' + util.inspect(env.all()));
if (!module.parent) {
  var port = env.get('port', process.env.PORT);
  server.listen(port, function () {
    app.logger.info("Express server listening on port " + port);
  });
}
