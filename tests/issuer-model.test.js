const _ = require('underscore');
const test = require('./');
const env = require('../lib/environment');
const db = require('../models');
const Issuer = require('../models/issuer');

function validIssuer() {
  return new Issuer({
    name: 'Some Issuer',
    contact: 'badges@example.org'
  });
}

test.applyFixtures({
  'testIssuer': new Issuer({
    name: 'Mozilla',
    contact: 'brian@mozillafoundation.org',
  })
}, function (fixtures) {
  test('Issuer#validate: everything is cool', function (t) {
    const issuer = validIssuer();
    issuer.validate(function (err) {
      t.notOk(err, 'should not have any errors');
      t.end();
    });
  });

  test('Issuer.findOne: works as expected, has default jwtSecret', function (t) {
    const expect = fixtures['testIssuer'];
    Issuer.findOne(function (err, result) {
      t.same(expect.id, result.id, 'should be the expected issuer');
      t.same(expect.jwtSecret.length, 64, 'should generate a random 64 character secret');
      t.same(expect.uid, 'mozilla', 'should generate uid from slug of name');
      t.end();
    });
  });

  test('Issuer#addOrganization', function (t) {
    const issuer = fixtures['testIssuer'];
    const orgs = ['Webmaker', 'Engagement', 'WebDev'].sort();
    orgs.forEach(function (o) {issuer.addOrganization({name: o})});
    issuer.save(function (err, result) {
      const orgNames = _.pluck(result.organizations, 'name').sort();
      t.same(orgNames, orgs);
      t.end();
    });
  });

  test('Issuer#hasAccess', function (t) {
    const issuer = new Issuer({
      accessList: [
        {email: 'one@example.org'},
        {email: 'two@example.org'},
      ]
    });
    t.same(issuer.hasAccess('one@example.org'), true);
    t.same(issuer.hasAccess('two@example.org'), true);
    t.same(issuer.hasAccess('three@example.org'), false);
    t.end();
  });

  test('Issuer#removeAccess', function (t) {
    const issuer = new Issuer({
      accessList: [{email: 'remove-me@example.org'}],
    });
    t.same(issuer.hasAccess('remove-me@example.org'), true);
    t.same(issuer.removeAccess('remove-me@example.org'), true);
    t.same(issuer.hasAccess('remove-me@example.org'), false);
    t.end();
  });

  test('Issuer#addAccess', function (t) {
    const issuer = new Issuer();
    issuer.addAccess('test1@example.org');
    issuer.addAccess('test1@example.org');
    issuer.addAccess('test1@example.org');
    issuer.addAccess(['test2@example.org', 'test3@example.org']);
    issuer.addAccess('test4@example.org', 'test5@example.org');

    [1,2,3,4,5].forEach(function (n) {
      t.same(issuer.hasAccess('test'+n+'@example.org'), true);
    });
    t.end();
  });

  test('Issuer.getAssertionObject', function (t) {
    env.temp({ origin: 'http://example.org' }, function (resetEnv) {
      const expect = {
        name: 'Mozilla',
        contact: 'brian@mozillafoundation.org',
        origin: 'http://example.org',
      };
      Issuer.getAssertionObject(function (err, result) {
        t.same(result, expect);
        resetEnv();
        t.end();
      });
    });
  });

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close();
    t.end();
  });

});
