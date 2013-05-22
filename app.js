var express = require('express');
var http = require('http');
var path = require('path');
var util = require('util');

var middleware = require('./middleware');
var template = require('./template');

var user = require('./routes/user');
var behavior = require('./routes/behavior');
var badge = require('./routes/badge');
var render = require('./routes/render');
var issuer = require('./routes/issuer');
var api = require('./routes/api');
var debug = require('./routes/debug');
var stats = require('./routes/stats');

var app = express();
var logger = app.logger = require('./lib/logger');
var env = app.env = require('./lib/environment');

var templateEnv = template.buildEnvironment({
  themeDir: process.env.THEME_DIR,
  staticMiddleware: express.static
});

templateEnv.express(app);

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon(__dirname + '/public/img/favicon.ico'));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(middleware.cookieParser());
  app.use(middleware.session());
  app.use(middleware.flash());
  app.use(middleware.csrf({whitelist: ['/v(1|2)/*']}));
  app.use(middleware.cors({whitelist: ['/v(1|2)/*']}));
  app.use(middleware.noCache({
    whitelist: ['/badge/assertion/*']
  }));
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

/** Routes */
app.get('/', badge.findNonOffline, render.all);

app.all('/issuer*', user.requireAuth({
  level: 'issuer',
  redirectTo: '/login'
}));

app.get('/issuer', [
  issuer.findByAccess,
  badge.findByIssuers,
], render.issuerIndex);

app.all('/issue/:badgeId', [
  badge.findById,
  badge.confirmAccess,
]);
app.get('/issue/:badgeId', render.issueBadge);
app.post('/issue/:badgeId', badge.issueMany);

app.all('/admin*', user.requireAuth({
  level: 'super',
  redirectTo: '/login'
}));

app.get('/admin/stats', [stats.monthly], render.stats);

// Badge listing
// -------------
var indexMiddleware = [
  badge.findAll,
  behavior.findAll,
  issuer.findAll,
];

app.get('/admin', indexMiddleware, render.badgeIndex);
app.get('/admin/badges', indexMiddleware, render.badgeIndex);

// Creating and editing a badge
// ----------------------------
var findBadgeByParamShortname = badge.findByShortName({
  container: 'param',
  field: 'shortname',
  required: true
});


// section middleware
app.all('/admin/badge/:shortname*', findBadgeByParamShortname);
app.all('/admin/badge*', issuer.findAll);

app.get('/admin/badge', render.newBadgeForm);
app.get('/admin/badge/:shortname', [behavior.findAll], render.showBadge);
app.get('/admin/badge/:shortname/edit', render.editBadgeForm);
app.get('/admin/badge/:shortname/claims/', render.manageClaimCodes);

app.post('/admin/badge', [
  badge.getUploadedImage({ required: true })
], badge.create);
app.post('/admin/badge/:shortname/edit', [
  badge.getUploadedImage()
], badge.update);
app.delete('/admin/badge/:shortname', badge.destroy);
app.post('/admin/badge/:shortname/behavior', badge.addBehavior);
app.delete('/admin/badge/:shortname/behavior', badge.removeBehavior);
app.post('/admin/badge/:shortname/claims', badge.addClaimCodes);
app.delete('/admin/badge/:shortname/claims/:code', badge.removeClaimCode);
app.patch('/admin/badge/:shortname/claims/:code', badge.releaseClaimCode);

// Issuers
// -------
app.all('/admin/issuer/:issuerId*',  issuer.findById);

app.get('/admin/issuer', render.newIssuerForm);
app.post('/admin/issuer', [
  issuer.getUploadedImage()
], issuer.create);
app.get('/admin/issuer/:issuerId', render.editIssuerForm);
app.post('/admin/issuer/:issuerId', [
  issuer.getUploadedImage()
], issuer.update);

// Creating new behaviors
// ----------------------
app.get('/admin/behavior', render.newBehaviorForm);
app.post('/admin/behavior', behavior.create);
app.delete('/admin/behavior/:shortname', [
  behavior.findByShortName
], behavior.destroy);

app.get('/admin/users',[
  user.findAll()
], render.userList);

app.delete('/admin/users', user.deleteInstancesByEmail);


// Public, non-admin endpoints
// ---------------------------
// XXX: these are to `relativeUrl` in models/badge.js and
// models/badge-instance.js. If you change these routes, change those
// methods.
app.get('/badge/image/:shortname.png', [
  findBadgeByParamShortname
], badge.image);
app.get('/badge/assertion/:hash', badge.assertion);
app.get('/badge/criteria/:shortname', [
   findBadgeByParamShortname
], render.criteria);

app.get('/claim', render.claim);

app.post('/claim',[
  badge.findByClaimCode()
], render.confirmClaim);

app.post('/claim/confirm',[
  badge.findByClaimCode()
], badge.awardToUser);

app.get('/404', render.notFound);

// User login/logout
// -------------------
app.get('/login', render.login);
app.post('/login', user.login);
app.post('/logout', user.logout);

// API endpoints
// -------------
app.get('/v2/badges', api.badges);

app.get('/v2/badge/:shortname', [
  findBadgeByParamShortname
], api.badge);

app.get('/v2/badge/:shortname/recommendations', [
  findBadgeByParamShortname
], api.recommendations);

app.get('/v2/user', [
  api.auth()
], api.user);

app.delete('/v2/user/badge/:shortname', [
  api.auth(),
], api.removeBadge);

app.post('/v2/user/badge/:shortname', [
  api.auth(),
  findBadgeByParamShortname,
], api.awardBadge);

app.get('/v2/badge/:shortname/claimcodes', [
  api.auth({user: false}),
  findBadgeByParamShortname,
], api.badgeClaimCodes);

app.post('/v2/user/behavior/:behavior/credit', [
  api.auth()
], api.credit);

app.post('/v2/user/mark-all-badges-as-read',[
  api.auth()
],api.markAllBadgesAsRead);

app.get('/v2/issuers', api.issuers);

app.get('/v2/programs', api.programs);

app.get('/v2/program/:programShortName', api.program);

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
