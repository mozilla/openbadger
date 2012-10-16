var test = require('./');
var env = require('../lib/environment');
var db = require('../models');
var Issuer = require('../models/issuer');

function validIssuer() {
  return new Issuer({
    name: 'Some Issuer',
    org: 'Some Organization',
    origin: 'http://example.org/',
    contact: 'badges@example.org'
  });
}

test.applyFixtures({
  'testIssuer': new Issuer({
    name: 'Mozilla',
    org: 'Webmaker',
    contact: 'brian@mozillafoundation.org'
  })
}, function (fixtures) {
  test('Issuer#validate: everything is cool', function (t) {
    var issuer = validIssuer();
    issuer.validate(function (err) {
      t.notOk(err, 'should not have any errors');
      t.end();
    });
  });

  test('Issuer#validate: bad contact', function (t) {
    var issuer = validIssuer();
    issuer.contact = 'not an email address'
    issuer.validate(function (err) {
      var error;
      t.ok(err, 'should have errors');
      error = err.errors.contact;
      t.ok(error, 'should have a contact error');
      t.same(error.type, 'regexp', 'should be a regexp error');
      t.end();
    });
  });

  test('Issuer.findOne: works as expected', function (t) {
    var expect = fixtures['testIssuer'];
    Issuer.findOne(function (err, result) {
      t.same(expect.id, result.id, 'should be the expected issuer');
      t.end();
    });
  });

  test('Issuer.getAssertionObject', function (t) {
    env.temp({ protocol: 'http', host: 'example.org', port: 80 }, function (resetEnv) {
      var expect = {
        name: 'Mozilla',
        org: 'Webmaker',
        contact: 'brian@mozillafoundation.org', origin: 'http://example.org:80'
      };
      Issuer.getAssertionObject(function (err, result) {
        t.same(result, expect);
        resetEnv();
        t.end();
      })
    });
  });


  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close();
    t.end();
  });

});
