var express = require('express');
var http = require('http');
var path = require('path');
var nunjucks = require('nunjucks');
var util = require('util');

var middleware = require('./middleware');
var routes = require('./routes');
var user = require('./routes/user');
var behavior = require('./routes/behavior');
var badge = require('./routes/badge');
var admin = require('./routes/admin');


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
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(user.middleware.requireAuth({
    whitelist: ['/login', '/logout'],
    redirectTo: '/login'
  }));
  app.use(app.router);
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/admin', admin.index);
app.get('/admin/badge', admin.newBadgeForm);
app.post('/admin/badge', badge.create);

app.get('/admin/badges', [
  badge.findAll
], admin.badgeIndex);


var badgeByShortname = badge.findByShortname({
  container: 'param',
  field: 'shortname',
  required: true
});

app.all('/admin/badge/:shortname*', badgeByShortname);
app.get('/admin/badge/:shortname', [
  behavior.findAll
], admin.show);

app.post('/admin/badge/:shortname/behavior', badge.addBehavior);
app.delete('/admin/badge/:shortname/behavior', badge.removeBehavior);

app.get('/admin/behavior', [
  badge.findByShortname({
    container: 'query',
    field: 'for',
  })
], admin.newBehaviorForm);

app.post('/admin/behavior', behavior.create);

app.get('/login', user.login);
app.post('/login', user.login);
app.get('/logout', user.logout);

app.get('/behaviors', behavior.readAll);
app.all('/behavior/:name', behavior.findByName);
app.get('/behavior/:name', behavior.readOne);
app.put('/behavior/:name', behavior.update);
app.patch('/behavior/:name', behavior.update);
app.delete('/behavior/:name', behavior.destroy);

module.exports = app;
