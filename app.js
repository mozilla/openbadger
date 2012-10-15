var express = require('express');
var http = require('http');
var path = require('path');
var nunjucks = require('nunjucks');
var util = require('util');

var middleware = require('./middleware');
var user = require('./routes/user');
var behavior = require('./routes/behavior');
var badge = require('./routes/badge');
var admin = require('./routes/admin');
var issuer = require('./routes/issuer');

var app = express();
var logger = app.logger = require('./lib/logger');
var env = app.env = require('./lib/environment');

(new nunjucks.Environment(
  new nunjucks.FileSystemLoader('views')
)).express(app);

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(middleware.cookieParser());
  app.use(middleware.session());
  app.use(middleware.flash());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(user.requireAuth({
    whitelist: [
      '/login',
      '/logout',
      '/badge/*'
    ],
    redirectTo: '/login'
  }));
  app.use(issuer.getIssuerConfig());
  app.use(app.router);
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

/** Routes */
// configuration page
app.get('/admin/config', admin.configure);

// show `create a badge` form
app.get('/admin/badge', admin.newBadgeForm);

// creating a badge from post
app.post('/admin/badge', badge.create);

// show the badge index
app.get('/', [badge.findAll], admin.badgeIndex);
app.get('/admin', [badge.findAll], admin.badgeIndex);
app.get('/admin/badges', [badge.findAll], admin.badgeIndex);

// middleware for finding badge by shortname
app.all('/admin/badge/:shortname*', badge.findByShortName({
  container: 'param',
  field: 'shortname',
  required: true
}));

// show edit form for single badge
app.get('/admin/badge/:shortname', [
  behavior.findAll
], admin.showBadge);

// add a behavior to a badge by post
app.post('/admin/badge/:shortname/behavior', badge.addBehavior);

// remove a behavior from a badge by delete
app.delete('/admin/badge/:shortname/behavior', badge.removeBehavior);

// show new behavior form
app.get('/admin/behavior', admin.newBehaviorForm);

// create a new behavior
app.post('/admin/behavior', behavior.create);

// get the badge image
app.get('/badge/image/:shortname.png', [
  badge.findByShortName({
    container: 'param',
    field: 'shortname',
    required: true
  })
], badge.image);


app.get('/login', admin.login);
app.post('/login', user.login);
app.get('/logout', user.logout);
app.get('/behaviors', behavior.readAll);
app.all('/behavior/:name', behavior.findByName);
app.get('/behavior/:name', behavior.readOne);
app.put('/behavior/:name', behavior.update);
app.patch('/behavior/:name', behavior.update);
app.delete('/behavior/:name', behavior.destroy);

module.exports = app;
