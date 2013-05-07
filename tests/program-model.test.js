const test = require('./');
const db = require('../models');
const Issuer = require('../models/issuer');
const Program = require('../models/program');

test.applyFixtures({
  'issuer': new Issuer({
    _id: 'issuer1',
    uid: 'example-org',
    name: 'Example.org',
    contact: 'a@example.org',
    url: 'https://example.org',
    description: 'Example Issuer'
  }),
  'program': new Program({
    _id: 'program1',
    name: 'Sample Program',
    issuer: 'issuer1',
    url: 'https://example.org/program',
  }),
}, function (fixtures) {

  test('Finding a program and an issuer', function (t) {
    const program = fixtures['program'];
    const issuer = fixtures['issuer'];
    Program.findOne({'_id': program._id})
      .populate('issuer')
      .exec(function (err, result) {
        t.same(result.issuer._id, issuer._id);
        t.end();
      });
  });

  test('Generating issuer json', function (t) {
    const issuer = fixtures['issuer'];
    const program = fixtures['program'];
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


  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
