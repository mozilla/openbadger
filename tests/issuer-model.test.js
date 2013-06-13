const _ = require('underscore');
const test = require('./');
const env = require('../lib/environment');
const db = require('../models');
const Issuer = require('../models/issuer');
const Program = require('../models/program');

function validIssuer() {
  return new Issuer({
    name: 'Some Issuer',
    contact: 'badges@example.org'
  });
}

test.applyFixtures({
  'issuer1': new Issuer({
    _id: 'issuer1',
    name: 'Issuer One',
    contact: 'one@example.org',
    accessList: [
      {email: 'both@example.org'},
      {email: 'one@example.org'},
    ],
    programs: ['program1', 'program2'],
  }),
  'issuer2': new Issuer({
    _id: 'issuer2',
    name: 'Issuer Two',
    contact: 'two@example.org',
    accessList: [
      {email: 'both@example.org'},
      {email: 'two@example.org'},
    ],
  }),
  'program1': new Program({
    _id: 'program1',
    name: 'Program 1',
    issuer: 'issuer1',
  }),
  'program2': new Program({
    _id: 'program2',
    name: 'Program 2',
    issuer: 'issuer1',
  }),
}, function (fixtures) {
  test('Issuers without contacts can be saved', function (t) {
    var issuer = new Issuer({name: 'Bop'});
    issuer.save(function(err) {
      t.same(err, null);
      t.end();
    });
  });

  test('Find & populate programs', function (t) {
    const issuer = fixtures['issuer1'];
    const programs = ['program1', 'program2'];
    Issuer.findOne({_id: issuer._id})
      .populate('programs')
      .exec(function (err, result) {
        t.same(_.pluck(result.programs, '_id'), programs);
        t.end();
      });
  });

  test('Issuer#validate: everything is cool', function (t) {
    const issuer = validIssuer();
    issuer.validate(function (err) {
      t.notOk(err, 'should not have any errors');
      t.end();
    });
  });

  test('Issuer.findOne: works as expected', function (t) {
    const expect = fixtures['issuer1'];
    Issuer.findOne({'_id': expect._id }, function (err, result) {
      t.same(expect.id, result.id, 'should be the expected issuer');
      t.same(expect.shortname, 'issuer-one', 'should generate shortname from slug of name');
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

  test('Issuer.findByAccess', function (t) {
    t.plan(3);
    Issuer.findByAccess('one@example.org', function (err, results) {
      t.same(fixtures['issuer1'].name, results[0].name);
    });
    Issuer.findByAccess('two@example.org', function (err, results) {
      t.same(fixtures['issuer2'].name, results[0].name);
    });
    Issuer.findByAccess('both@example.org', function (err, results) {
      console.dir(results);
      const names = results.map(function (o) { return o.name }).sort();
      t.same(names, ['Issuer One', 'Issuer Two']);
    });
  });

  // necessary to stop the test runner
  test('shutting down #', function (t) {
    db.close();
    t.end();
  });

});
