#!/usr/bin/env node

var async = require('async');
var fs = require('fs');
var path = require('path');

var db = require('../models');
var Issuer = require('../models/issuer');
var Program = require('../models/program');
var Badge = require('../models/badge');

var image = function(name) {
  return fs.readFileSync(path.join(__dirname, '..', 'tests', 'assets', name));
};

var fixtures = [
  new Issuer({
    _id: 'mozilla',
    shortname: 'mozilla',
    name: 'Mozilla',
    url: 'http://mozilla.org',
    description: 'Mozilla is a proudly non-profit organization dedicated to keeping the power of the Web in people’s hands.',
    image: image('mozilla-wordmark.png'),
    programs: ['webmaker']
  }),
  new Program({
    _id: 'webmaker',
    name: 'Webmaker',
    shortname: 'webmaker',
    issuer: 'mozilla',
    url: 'http://webmaker.org',
    description: 'A global community that doesn\'t just use the web, but makes it by creating, remixing and teaching.',
    image: image('webmaker-logo.png')
  }),
  new Badge({
    program: 'webmaker',
    name: 'Div Master',
    shortname: 'div-master',
    description: 'The Div Master mini-badge is part of the Mozilla Webmaker series. It represents an HTML skill and is earned by properly using the div tag in a Mozilla Webmaker Project.\n\nIt indicates that the earner has completed this task successfully at least 2 times in Webmaker projects.',
    image: image('div-master.png')
  }),
  new Badge({
    program: 'webmaker',
    name: 'A Lister',
    shortname: 'a-lister',
    description: 'The A Lister mini-badge is part of the Mozilla Webmaker series. It represents an HTML skill and is earned by fixing or adding a list to a Mozilla Webmaker project by properly using the ordered and unordered list tags.\n\nIt indicates that the earner has completed this task successfully at least 3 times in Webmaker projects.',
    image: image('a-lister.png')
  })
];

console.log('Importing sample data...');

async.mapSeries(fixtures, function(doc, cb) {
  console.log("  " + doc.constructor.modelName + ": " + doc.name);
  doc.save(cb);
}, function (err, results) {
  if (err) throw err;

  console.log('Done.');
  db.close();
});
