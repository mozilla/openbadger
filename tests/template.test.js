var test = require('./');
var express = require('express');
var http = require('http');
var request = require('supertest');

var buildEnv = require('../template').buildEnvironment;

function handle(err, res) {
  if (err) {
    if (res)
      console.log(res.text);
    throw err;
  }
}

test("'selected' filter works w/ string values", function(t) {
  var env = buildEnv({});
  t.equal(env.filters['selected']('a', 'a'), "selected");
  t.equal(env.filters['selected']('b', 'a'), "");
  t.end();
});

test("'selected' filter works w/ array values", function(t) {
  var env = buildEnv({});
  t.equal(env.filters['selected'](['a', 'b'], 'b'), "selected");
  t.equal(env.filters['selected'](['a', 'c'], 'b'), "");
  t.end();
});

test("app should serve non-theme static files", function(t) {
  var app = express();
  var env = buildEnv({staticMiddleware: express.static});
  var srv = http.createServer(app);

  env.express(app);
  request(srv)
    .get('/js/jquery.min.js')
    .expect(200, function(err, res) {
      handle(err, res);
      t.ok(true, "non-theme static files are retrievable");
      srv.close();
      t.end();
    });
});

test("theme static files override non-theme ones", function(t) {
  var app = express();
  var env = buildEnv({
    themeDir: __dirname + '/example-theme',
    staticMiddleware: express.static
  });
  var srv = http.createServer(app);

  env.express(app);
  request(srv)
    .get('/js/jquery.min.js')
    .expect("hai2u!")
    .expect(200, function(err, res) {
      handle(err, res);
      t.ok(true, "theme static files are retrievable");
      srv.close();
      t.end();
    });
});

test("theme static file set inherits from non-theme set", function(t) {
  var app = express();
  var env = buildEnv({
    themeDir: __dirname + '/example-theme',
    staticMiddleware: express.static
  });
  var srv = http.createServer(app);

  env.express(app);
  request(srv)
    .get('/js/bootstrap.min.js')
    .expect(200, function(err, res) {
      handle(err, res);
      t.ok(true, "non-theme static files are inherited");
      srv.close();
      t.end();
    });
});

test("app should allow rendering of non-theme templates", function(t) {
  var app = express();
  var env = buildEnv({staticMiddleware: express.static});
  var srv = http.createServer(app);

  app.get('/foo', function(req, res) {
    return res.render('admin/base.html');
  });

  env.express(app);
  request(srv)
    .get('/foo')
    .expect(200, function(err, res) {
      handle(err, res);
      t.ok(true, "non-theme templates can be rendered");
      srv.close();
      t.end();
    });
});

test("app should allow rendering of theme templates", function(t) {
  var app = express();
  var env = buildEnv({
    themeDir: __dirname + '/example-theme',
    staticMiddleware: express.static
  });
  var srv = http.createServer(app);

  app.get('/foo', function(req, res) {
    return res.render('admin/base.html');
  });

  env.express(app);
  request(srv)
    .get('/foo')
    .expect(/HEY I AM OVERRIDING A THING/)
    .expect(200, function(err, res) {
      handle(err, res);
      t.ok(true, "theme templates can be rendered");
      srv.close();
      t.end();
    });
});
