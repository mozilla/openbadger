const _ = require('underscore');
const async = require('async');
const test = require('./');
const env = require('../lib/environment');
const db = require('../models');
const Issuer = require('../models/issuer');
const Program = require('../models/program');
const Badge = require('../models/badge');

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
  'deleted-issuer': new Issuer({
    _id: 'deleted-issuer',
    name: 'Deleted Issuer',
    contact: 'blah@example.org',
    deleted: true,
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
  'badge1': new Badge({
    _id: 'bba3989d4825d81b5587f96b7d8ba6941d590fff',
    program: 'program1',
    name: 'Basic Badge',
    shortname: 'badge1',
    description: 'For doing stuff.',
    image: test.asset('sample.png'),
  })
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

  test("Issuer.find() finds only undeleted issuers by default", function(t) {
    Issuer.find({_id: 'deleted-issuer'}, function(err, issuers) {
      if (err) throw err;
      t.equal(issuers.length, 0);
      t.end();
    });
  });

  test("Issuer.find() can find deleted issuers if needed", function(t) {
    Issuer.find({_id: 'deleted-issuer', deleted: true}, function(err, issuers) {
      if (err) throw err;
      t.equal(issuers.length, 1);
      t.end();
    });
  });

  test("Issuer.findOne() finds only undeleted issuers by default", function(t) {
    Issuer.findOne({_id: 'deleted-issuer'}, function(err, issuer) {
      if (err) throw err;
      t.equal(issuer, null);
      t.end();
    });
  });

  test("Issuer.findOne() can find deleted issuers if needed", function(t) {
    Issuer.findOne({_id: 'deleted-issuer', deleted: true}, function(err, issuer) {
      if (err) throw err;
      t.ok(issuer);
      t.end();
    });
  });

  test("Issuer#undoablyDelete() works", function(t) {
    t.equal(fixtures['issuer1'].deleted, false);
    fixtures['issuer1'].undoablyDelete(function(err, record) {
      if (err) throw err;
      t.ok(!record.isModified(), "deletion record should be saved");
      t.same(record.items.map(function(i) { return i.model; }), [
        "Issuer", "Program", "Program", "Badge"
      ]);
      t.equal(fixtures['issuer1'].deleted, true);
      Program.find({deleted: true}, function(err, programs) {
        if (err) throw err;

        t.equal(programs.length, 2);
        Badge.find({deleted: true}, function(err, badges) {
          if (err) throw err;
          t.equal(badges.length, 1);
          if (badges.length)
            t.equal(badges[0].shortname, 'badge1');

          record.undo(function(err) {
            if (err) throw err;

            t.equal(record.name, "Issuer issuer1");
            async.forEach([Program, Badge, Issuer], function(model, cb) {
              model.find({deleted: true}, function(err, items) {
                if (err) return cb(err);
                t.same(items.filter(function(item) {
                  return !/deleted/.test(item._id);
                }), []);
                cb();
              });
            }, function(err) {
              if (err) throw err;
              t.end();
            });
          });
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
