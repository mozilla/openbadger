const _ = require('underscore');
const fs = require('fs');
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

exports.findProgramById = function findProgramById(req, res, next) {
  Program.findById(req.param('programId'))
    .exec(function (err, program) {
      if (err) return next(err);
      if (!program)
        return res.send(404);
      req.program = program;
      return next();
    });
};
exports.findByAccess = function findByAccess(req, res, next) {
  Issuer.findByAccess(req.session.user)
    .populate('programs')
    .exec(function (err, issuers) {
      if (err) return next(err);
      req.issuers = issuers;
      return next();
    });
};

exports.getUploadedImage = function getUploadedImage(options) {
  options = _.extend({field: 'image'}, options||{});
  const field = options.field;
  return function (req, res, next) {
    console.dir(req.files);
    const image = req.files[options.field];
    return fs.readFile(image.path, function (err, buffer) {
      if (err) return next(err);
      req.image = buffer;
      return next();
    });
  };
};


function makeIssuer(issuer, form, image) {
  _.extend(issuer, {
    name: form.name,
    contact: form.contact,
    url: form.url,
    description: form.description,
  });
  if (image)
    issuer.image = image;
  return issuer;
};

exports.create = function create(req, res, next) {
  const form = req.body;
  const accessList = handleAccessList(form.accessList);
  const issuer = makeIssuer(new Issuer, form, req.image);
  issuer.accessList = accessList;
  issuer.save(function (err, results) {
    if (err) return next(err);
    return res.redirect(303, '/admin');
  });
};

exports.update = function update(req, res, next) {
  const form = req.body;
  const accessList = handleAccessList(form.accessList);
  const issuer = makeIssuer(req.issuer, form);
  issuer.accessList = accessList;
  if (req.image.length)
    issuer.image = req.image;
  issuer.save(function (err, results) {
    if (err) return next(err);
    return res.redirect(303, '/admin');
  });
};

exports.newProgram = function newProgram(req, res, next) {
  const form = req.body;
  const issuer = req.issuer;
  new Program({
    name: form.name,
    issuer: issuer.id,
    description: form.description,
    startDate: form.startDate,
    endDate: form.endDate,
    url: form.url,
    contact: form.contact,
    phone: form.phone,
    image: req.image,
    shortname: util.format(
      '%s-%s',
      issuer.shortname,
      util.slugify(form.name)
    ),
  }).save(function (err, program) {
    if (err) return next(err);
    issuer.programs.push(program._id);
    issuer.save(function () {
      if (err) return next(err);
      return res.redirect(303, '/admin');
    });
  });
};

exports.updateProgram = function updateProgram(req, res, next) {
  const form = req.body;
  const issuer = req.issuer;
  const program = req.program;
  const image = req.image;

  _.extend(program, {
    name: form.name,
    description: form.description,
    startDate: form.startDate,
    endDate: form.endDate,
    url: form.url,
    contact: form.contact,
    phone: form.phone,
  });
  if (image.length)
    program.image = image;

  program.save(function (err) {
    if (err) return next(err);
    return res.redirect(303, '/admin');
  });
};

exports.image = function image(req, res, next) {
  console.dir(req.issuer);
  res.type('png');
  return res.send(req.issuer.image);
};
exports.programImage = function image(req, res, next) {
  console.dir(req.program);
  res.type('png');
  return res.send(req.program.image);
};

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
