#!/usr/bin/env node
const argv = require('optimist').argv;
const phrases = require('../lib/phrases');
const iteratorStream = require('iterator-stream');
const fs = require('fs');
const pathutil = require('path');
const util = require('util');

function log() {
  const args = [].slice.call(arguments);
  const str = util.format.apply(util, args);
  process.stderr.write(str + '\n');
}

function usage(err) {
  if (err) log('\nError:', err, '\n');
  log('%s -n <count> [files-to-exclude, ...]', argv.$0);
  log('  Prints a bunch of random phrases to stdout.');
  log('  If given files, will avoid any phrases that appear in those files');
  process.exit(1);
}

function fileToArray(file) {
  return (fs.readFileSync(pathutil.join(process.cwd(), file))
    .toString()
    .trim()
    .split('\n'));
}

function inArrayFilter(array) {
  return function (v) {
    if (array.indexOf(v) > -1) log('DUPLICATE:', v);
    return array.indexOf(v) == -1;
  };
}

function main() {
  const count = argv.n || argv.count
  const excludeFiles = argv._;
  var exclude = [];
  if (!count)
    return usage('requires -n');

  log('generating', count, 'phrases');

  var filter = function (x) { return true };

  if (excludeFiles.length) {
    log('excluding', excludeFiles);
    exclude = (excludeFiles
      .map(fileToArray)
      .reduce(function (exclude, phrases) {
        return exclude.concat(phrases);
      }, exclude));
  }

  iteratorStream(phrases.iterator, {
    transform: function (v) { return v.join('-') },
    filter: inArrayFilter(exclude),
    take: count,
    separator: '\n',
    method: 'random'
  }).pipe(process.stdout);

}

if (!module.parent) main();

