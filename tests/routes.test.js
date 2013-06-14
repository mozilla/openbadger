const http = require('http');
const express = require('express');
const request = require('supertest');
const jwt = require('jwt-simple');

const test = require('./');
const env = require('../lib/environment');
const db = require('../models');
const routes = require('../routes');
const api = require('../routes/api');

var fixtures = require('./badge-model.fixtures.js');

test.applyFixtures(fixtures, function () {
  var assertionUrl, badgeUrl, criteriaUrl, issuerUrl;
  var app = express();
  var srv = http.createServer(app);

  api.jwtSecret = 'lol';
  app.use(express.bodyParser());
  app.use(function(req, res, next) {
    req.session = {};
    res.render = function(template, context) {
      return res.send({
        type: 'fakeRender',
        template: template,
        context: context
      });
    };
    next();
  });

  routes.define(app);

  app.use(function(err, req, res, next) {
    console.error("500 Internal Server Error traceback:");
    console.error(err.stack);
    return res.send(500, "Error, see stderr output.");
  });

  test('claiming a badge works', function(t) {
    request(srv)
      .post('/v2/claim')
      .send({
        auth: jwt.encode({prn: 'foo@bar.org'}, 'lol'),
        code: 'will-claim',
        email: 'foo@bar.org'
      })
      .expect(200, function(err, res) {
        if (err) throw err;
        t.equal(res.body.status, 'ok');
        assertionUrl = res.body.url;
        t.end();
      });
  });

  test('getting an assertion works', function(t) {
    request(srv)
      .get(assertionUrl)
      .expect(200, function(err, res) {
        if (err) throw err;
        t.equal(res.body.recipient.type, 'email');
        t.equal(res.body.recipient.hashed, true);
        t.same(res.body.verify, {
          type: 'hosted',
          url: assertionUrl
        });
        // TODO: verify salted hash is correct?

        badgeUrl = res.body.badge;
        t.end();
      });
  });

  test('getting badge class JSON works', function(t) {
    request(srv)
      .get(badgeUrl)
      .expect(200, function(err, res) {
        if (err) throw err;
        t.equal(res.body.name, 'Offline badge');
        t.ok(/png/.test(res.body.image));

        criteriaUrl = res.body.criteria;
        issuerUrl = res.body.issuer;
        t.end();
      });
  });

  test('getting issuer JSON works', function(t) {
    request(srv)
      .get(issuerUrl)
      .expect(200, function(err, res) {
        if (err) throw err;
        t.same(res.body, {
          name: 'Badge Authority',
          org: 'Some Program',
          contact: 'brian@example.org',
          url: 'http://example.org/program'
        });
        t.end();
      });
  });

  test('getting criteria URL works', function(t) {
    request(srv)
      .get(criteriaUrl)
      .expect(200, function(err, res) {
        t.equal(res.body.type, 'fakeRender');
        t.equal(res.body.template, 'public/criteria.html');
        t.end();
      });
  });

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    srv.close();
    db.close();
    t.end();
  });
});
