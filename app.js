if ( process.env.NEW_RELIC_HOME ) {
  require( 'newrelic' );
}

var express = require('express');
var http = require('http');
var util = require('util');
var colors = require('colors');

var middleware = require('./middleware');
var template = require('./template');
var routes = require('./routes');
var healthCheck = require('./routes/health-check');
var render = require('./routes/render');
var debug = require('./routes/debug');
var api = require('./routes/api');

var app = express();
var logger = app.logger = require('./lib/logger');
var env = app.env = require('./lib/environment');
var sessionStore = middleware.getSessionStore(env);
var healthChecker = healthCheck({
  auth: express.basicAuth('health_check', env.get('secret')),
  checks: {
    database: healthCheck.checker(require('./models').healthCheck),
    s3: healthCheck.checker(require('./lib/s3').healthCheck),
    sessionStorage: healthCheck.sessionStorageChecker(sessionStore),
    webhooks: healthCheck.checker(require('./lib/webhooks').healthCheck)
  }
});
var templateEnv = template.buildEnvironment({
  themeDir: process.env.THEME_DIR,
  staticMiddleware: express.static
});

templateEnv.express(app);

app.locals.PERSONA_INCLUDE_JS_URL = "https://login.persona.org/include.js";
api.jwtSecret = env.get('jwt_secret');
api.limitedJwtSecret = env.get('limited_jwt_secret');

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon(__dirname + '/public/img/favicon.ico'));
  app.use(middleware.logger());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(middleware.cookieParser());
  app.use(middleware.session(sessionStore));
  app.use(middleware.flash());

  app.use(middleware.csrf({whitelist: routes.whitelists.CSRF.concat([
    '/health_check'
  ])}));
  app.use(middleware.cors({whitelist: routes.whitelists.CORS}));
  app.use(middleware.noCache({whitelist: routes.whitelists.NO_CACHE}));
  app.use(middleware.strictTransport());
  app.use(middleware.noFrame());

  app.use(app.router);

  // if we've fallen through the router, it's a 404
  app.use(render.notFound);
});

app.configure('development', function () {
  if ('OPENBADGER_ENABLE_STUBBYID' in process.env) {
    app.locals.PERSONA_INCLUDE_JS_URL = '/js/stubbyid.js';
    require('./lib/persona').verify = function(assertion, subdomain, cb) {
      if (typeof subdomain == 'function') cb = subdomain;
      cb(null, assertion);
    };
  }
  app.get('/500', render.nextError);
  app.use(express.errorHandler());
});

app.configure('production', function () {
  app.use(render.errorHandler);
});

routes.define(app);
app.get('/health_check', healthChecker);

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
    app.logger.info("Performing health check.");

    healthChecker.runChecks(function(results) {
      var consoleStr = healthCheck.resultsToConsoleString(results);
      console.log("Health check results:\n");
      if (results.status != "OK") {
        console.error(consoleStr + "\n");
        console.error(("One or more critical services are down or " +
                       "misconfigured. Please fix them!").red.bold);
      } else {
        console.log(consoleStr);
        console.log(("\nHealth check indicates all systems are " +
                     "functional.").green);
      }
    });
  });
}
