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
  api.jwtSecret = 'lol';

  test('claiming a badge & getting its assertion works', function(t) {
    var app = express();
    var srv = http.createServer(app);

    app.use(express.bodyParser());

    routes.define(app);

    app.use(function(err, req, res, next) {
      console.error("500 Internal Server Error traceback:");
      console.error(err.stack);
      return res.send(500, "Error, see stderr output.");
    });

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
        var assertionUrl = res.body.url;

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

            var badgeUrl = res.body.badge;

            // TODO: verify salted hash is correct?

            request(srv)
              .get(badgeUrl)
              .end(function(err, res) {
                t.skip("TODO: Verify badge URL exists and doesn't 404.");

                if (err) throw err;
                srv.close();
                t.end();
              });
          });

      });
  });

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close();
    t.end();
  });
});
