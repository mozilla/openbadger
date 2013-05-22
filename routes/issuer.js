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
  const post = req.body;
  const accessList = handleAccessList(post.accessList);
  const issuer = makeIssuer(new Issuer, post, req.image);
  issuer.accessList = accessList;
  issuer.save(function (err, results) {
    if (err) return next(err);
    return res.redirect(303, '/admin');
  });
};

exports.update = function update(req, res, next) {
  const post = req.body;
  const accessList = handleAccessList(post.accessList);
  const issuer = makeIssuer(req.issuer, post);
  issuer.accessList = accessList;
  if (req.image.length)
    issuer.image = req.image;
  issuer.save(function (err, results) {
    if (err) return next(err);
    return res.redirect(303, '/admin');
  });
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
