var user = require('./user');
var behavior = require('./behavior');
var badge = require('./badge');
var render = require('./render');
var issuer = require('./issuer');
var api = require('./api');
var undo = require('./undo');
var stats = require('./stats');

const whitelists = exports.whitelists = {
  API: '/v(1|2)/*',
  ASSERTION: '/badge/assertion/*'
};

whitelists.CSRF = [whitelists.API];
whitelists.CORS = [whitelists.API];
whitelists.NO_CACHE = [whitelists.ASSERTION];

function addClaimManagementRoutes(app, prefix) {
  app.get(prefix + '/', render.manageClaimCodes);
  app.post(prefix, badge.addClaimCodes);
  app.post(prefix + '/bulk-action', badge.bulkClaimCodeAction);
  app.get(prefix + '/unclaimed.txt', badge.getUnclaimedCodesTxt);
  app.get(prefix + '/unclaimed.html', render.getUnclaimedCodesHtml);
  app.delete(prefix + '/:code', badge.removeClaimCode);
  app.patch(prefix + '/:code', badge.releaseClaimCode);
}

exports.define = function defineRoutes(app) {
  /** Routes */
  app.get('/', render.anonymousHome);

  app.all('/issuer*', user.requireAuth({
    level: 'issuer',
    redirectTo: '/login',
    whitelist: ['/issuer/image/*']
  }));

  app.get('/issuer', [
    issuer.findByAccess,
    badge.findByIssuers,
  ], render.issuerIndex);

  app.all('/issue/:badgeId*', [
    badge.findById,
    badge.confirmAccess,
  ]);
  app.get('/issue/:badgeId', render.issueBadge);
  app.post('/issue/:badgeId', badge.issueMany);
  app.post('/issue/:badgeId/with-evidence', badge.issueOneWithEvidence);
  addClaimManagementRoutes(app, '/issue/:badgeId/claims');

  app.all('/admin*', user.requireAuth({
    level: 'super',
    redirectTo: '/login'
  }));

  app.post('/admin/undo/:undoId', undo);
  app.get('/admin/stats', [stats.monthly], render.stats);

  // Badge listing
  // -------------
  var indexMiddleware = [
    badge.findAll,
    issuer.findAll,
    undo.findAll
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
  addClaimManagementRoutes(app, '/admin/badge/:shortname/claims');

  app.post('/admin/badge', [
    badge.getUploadedImage({ required: true })
  ], badge.create);
  app.post('/admin/badge/:shortname/edit', [
    badge.getUploadedImage()
  ], badge.update);
  app.delete('/admin/badge/:shortname', badge.destroy);
  app.post('/admin/badge/:shortname/behavior', badge.addBehavior);
  app.delete('/admin/badge/:shortname/behavior', badge.removeBehavior);

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
  app.delete('/admin/issuer/:issuerId', issuer.destroy);
  app.get('/admin/issuer/:issuerId/program', render.newProgramForm);
  app.post('/admin/issuer/:issuerId/program', [
    issuer.getUploadedImage()
  ], issuer.newProgram);
  app.all('/admin/program/:programId*', issuer.findProgramById);
  app.get('/admin/program/:programId', [
    issuer.findAll
  ],render.editProgramForm);
  app.post('/admin/program/:programId', [
    issuer.findById,
    issuer.getUploadedImage()
  ], issuer.updateProgram);
  app.delete('/admin/program/:programId', issuer.destroyProgram);

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
  app.get('/badge/meta/:shortname', [
    findBadgeByParamShortname
  ], badge.meta);
  app.get('/badge/criteria/:shortname', [
    findBadgeByParamShortname
  ], render.criteria);
  app.get('/program/meta/:programId', [
    issuer.findProgramById
  ], issuer.meta);

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

  // 'similar' aliased to 'recommendations'
  app.get('/v2/badge/:shortname/similar', [
    findBadgeByParamShortname
  ], api.similarBadges);
  app.get('/v2/badge/:shortname/recommendations', [
    findBadgeByParamShortname
  ], api.similarBadges);

  app.get('/v2/unclaimed', [
    api.auth()
  ], api.getUnclaimedBadgeInfoFromCode);

  app.get('/v2/unclaimed/evidence', [
    api.auth()
  ], api.getClaimCodeEvidence);

  app.post('/v2/claim', [
    api.auth()
  ], api.awardBadgeFromClaimCode);

  app.get('/v2/user', [
    api.auth()
  ], api.user);

  app.get('/v2/user/recommendations', [
    api.auth()
  ], api.badgeRecommendations);

  app.get('/v2/user/badge/:shortname', [
    api.auth()
  ], api.userBadge);

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
  app.post('/v2/test/webhook', [api.auth()], api.testWebhook);

  // Resources
  app.get('/issuer/image/:issuerId', [
    issuer.findById
  ], issuer.image);
  app.get('/program/image/:programId', [
    issuer.findProgramById
  ], issuer.programImage);

  return app;
};
