const Issuer = require('../models/issuer');
const Program = require('../models/program');
const async = require('async');
const util = require('../lib/util');

const method = util.method;
const prop = util.prop;

exports.findAll = function findAll(req, res, next) {
  Issuer.find({})
    .populate('programs')
    .exec(function (err, issuers) {
      if (err) return next(err);
      req.issuers = issuers;
      return next();
    });
};

exports.findById = function findById(req, res, next) {
  Issuer.findById(req.param('issuerId'))
    .populate('programs')
    .exec(function (err, issuer) {
      if (err) return next(err);
      if (!issuer)
        return res.send(404);
      req.issuer = issuer;
      return next();
    });
};

exports.create = function create(req, res, next) {
  const post = req.body;
  const accessList = handleAccessList(post.accessList);

  const issuer = new Issuer({
    name: post.name,
    contact: post.contact,
    url: post.url,
    description: post.description,
    accessList: accessList,
  });
  const programs = handleNewPrograms(post.program, issuer);
  const objects = ([issuer]).concat(programs);
  issuer.programs = programs.map(prop('_id'));
  saveNewObjects(objects, function (err, results) {
    if (err) return next(err);
    return res.redirect(303, '/admin');
  });
};

exports.update = function update(req, res, next) {
  const post = req.body;
  const issuer = req.issuer;
  const accessList = handleAccessList(post.accessList);
  ['name',
   'contact',
   'url',
   'description',
  ].forEach(function (prop) {
    issuer[prop] = post[prop];
  });

  issuer.accessList = accessList;

  const existing = handleExistingPrograms(post.existingProgram);
  const programs = handleNewPrograms(post.program, issuer);
  const objects = ([issuer]).concat(programs);

  issuer.programs = issuer.programs.concat(programs);

  async.parallel([
    saveExistingPrograms.bind(null, existing),
    saveNewObjects.bind(null, objects)
  ], function done(err, results) {
    if (err) return next(err);
    return res.redirect(303, '/admin');
  });
};

function saveNewObjects(objects, callback) {
  return async.map(objects, method('save'), callback);
}

function saveExistingPrograms(existing, callback) {
  return async.map(
    existing,
    function saveProgram(obj, cb) {
      const id = obj[0];
      const props = obj[1];
      return Program.findByIdAndUpdate(id, props, cb);
    },
    callback
  );
}

function handleExistingPrograms(existing) {
  return Object.keys(existing).map(function (id) {
    return [ id, {
      name: existing[id].name,
      url: existing[id].url,
      contact: existing[id].contact,
    }];
  });
}

function handleAccessList(accessList) {
  return (
    accessList
      .trim()
      .split('\n')
      .map(method('trim'))
      .filter(prop('length'))
      .map(function (str) {
        return {email: str};
      })
  );
}

function handleNewPrograms(progs, issuer) {
  return progs.filter(function (prog) {
    return (prog.name || prog.url || prog.contact);
  }).map(function (prog) {
    return new Program({
      name: prog.name,
      url: prog.url,
      contact: prog.contact,
      issuer: issuer._id
    });
  });
}
