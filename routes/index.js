var user = require('./user');
var behavior = require('./behavior');
var badge = require('./badge');
var render = require('./render');
var issuer = require('./issuer');
var api = require('./api');
var stats = require('./stats');

const whitelists = exports.whitelists = {
  API: '/v(1|2)/*',
  ASSERTION: '/badge/assertion/*'
};

exports.applyMiddleware = function useMiddleware(app, middleware) {
  app.use(middleware.csrf({whitelist: [whitelists.API]}));
  app.use(middleware.cors({whitelist: [whitelists.API]}));
  app.use(middleware.noCache({
    whitelist: [whitelists.ASSERTION]
  }));
};

exports.define = function defineRoutes(app) {
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
  app.get('/admin/issuer/:issuerId/program', render.newProgramForm);
  app.post('/admin/issuer/:issuerId/program', [
    issuer.getUploadedImage()
  ], issuer.newProgram);
  app.all('/admin/program/:programId*', issuer.findProgramById);
  app.get('/admin/program/:programId', render.editProgramForm);
  app.post('/admin/program/:programId', [
    issuer.getUploadedImage()
  ], issuer.updateProgram);


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

  app.get('/v2/unclaimed', [
    api.auth()
  ], api.getUnclaimedBadgeInfoFromCode);

  app.post('/v2/claim', [
    api.auth()
  ], api.awardBadgeFromClaimCode);

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
  app.get('/v2/issuer/:issuerShortName', api.issuer);

  // Resources
  app.get('/issuer/image/:issuerId', [
    issuer.findById
  ], issuer.image);
  app.get('/program/image/:programId', [
    issuer.findProgramById
  ], issuer.programImage);

  return app;
};
