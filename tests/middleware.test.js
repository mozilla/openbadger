var test = require('./');
var express = require('express');
var http = require('http');
var request = require('supertest');
var middleware = require('../middleware');

function handle(err, res) {
  if (err) {
    if (res)
      console.log(res.text);
    throw err;
  }
}

test("flash middleware should work", function(t) {
  var app = express();
  var srv = http.createServer(app);
  var session = {};
  var getFlashMessages;
  var expectedMessages = [{
    category: "info",
    sup: "yo"
  }];
  
  app.use(function(req, res, next) { req.session = session; next(); });
  app.use(middleware.flash());
  app.get('/foo', function(req, res, next) {
    req.flash('info', {sup: 'yo'});
    getFlashMessages = res.locals.messages;
    return res.send('lol');
  });

  request(srv)
    .get('/foo')
    .expect(200, function(err, res) {
      handle(err, res);
      t.same(session, {
        flash: {
          info: [{
            sup: "yo"
          }]
        }
      });
      t.same(getFlashMessages(), expectedMessages);
      t.same(session, {flash: {}});
      t.same(getFlashMessages(), expectedMessages);
      srv.close();
      t.end();
    });
});
