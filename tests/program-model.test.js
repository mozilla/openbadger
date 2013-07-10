const test = require('./');
const db = require('../models');
const Issuer = require('../models/issuer');
const Program = require('../models/program');
const util = require('../lib/util');
const async = require('async');

test.applyFixtures({
  'issuer': new Issuer({
    _id: 'issuer1',
    name: 'Example.org',
    contact: 'a@example.org',
    url: 'https://example.org',
    description: 'Example Issuer',
    programs: ['program1', 'ghost-program'],
  }),
  'issuer2': new Issuer({
    _id: 'issuer2',
    name: 'Other Issuer',
  }),
  'program': new Program({
    _id: 'program1',
    name: 'Sample Program',
    issuer: 'issuer1',
    url: 'https://example.org/program',
  }),
  'orphaned-program': new Program({
    _id: 'orphaned-program',
    name: 'Orphaned Program',
    issuer: 'dead-issuer',
    url: 'https://example.org/program',
  }),
}, function (fx) {

  test('Finding a program and an issuer', function (t) {
    const program = fx['program'];
    const issuer = fx['issuer'];
    Program.findOne({'_id': program._id})
      .populate('issuer')
      .exec(function (err, result) {
        t.same(result.issuer._id, issuer._id);
        t.end();
      });
  });

  test('Generating issuer json', function (t) {
    const issuer = fx['issuer'];
    const program = fx['program'];
    const expect =  {
      name: issuer.name,
      org: program.name,
      contact: program.contact || issuer.contact,
      url: program.url || issuer.url,
      description: program.description || issuer.description
    };

    program.populate('issuer', function () {
      t.same(program.makeJson(), expect);
      t.end();
    });
  });

  test('Program#changeIssuerAndSave: normal functionality', function (t) {
    const program = fx['program'];
    const oldIssuer = fx['issuer'];
    const newIssuer = fx['issuer2'];

    t.same(program.issuer.id, oldIssuer.id);

    program.changeIssuerAndSave(newIssuer, function (err) {
      const issuers = [oldIssuer.id, newIssuer.id];
      async.map(issuers, Issuer.findById.bind(Issuer), function (err, iss) {
        const oldPrograms = [].slice.call(iss[0].programs);
        const newPrograms = [].slice.call(iss[1].programs);
        t.same(program.issuer.id, newIssuer.id);
        t.same(oldPrograms, ['ghost-program']);
        t.same(newPrograms, ['program1']);
        t.end();
      });
    });
  });

  test('Program#changeIssuerAndSave: do not crash with orphaned program', function (t) {
    const program = fx['orphaned-program'];
    const newIssuer = fx['issuer2'];
    program.changeIssuerAndSave(newIssuer, function (err) {
      t.same(program.issuer.id, newIssuer.id);
      t.end();
    });
  });

  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
