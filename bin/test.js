#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;
var async = require('async');

const ENV = {
  NODE_ENV: 'test',
  OPENBADGER_MONGO_HOST: 'localhost',
  OPENBADGER_MONGO_PORT: '27017',
  OPENBADGER_MONGO_DB: 'openbadger_test',
  OPENBADGER_HOST: '',
  OPENBADGER_PROTOCOL: '',
  OPENBADGER_PORT: '',
  OPENBADGER_PERSONA_AUDIENCE: '',
  OPENBADGER_REDIS_HOST: '',
  OPENBADGER_REDIS_PORT: ''
};

const USAGE = [
  'Usage: $0 [options] [test-filenames]',
  '',
  'If no test filenames are provided, all tests will be run.',
  '',
  'Tests use localhost mongodb with the ' + ENV.OPENBADGER_MONGO_DB + ' db.'
];

var cmdline = require('optimist')
  .usage(USAGE.join('\n'))
  .options('f', {
    alias: 'filter',
    desc: 'filter test files by regexp'
  })
  .options('d', {
    alias: 'debug',
    type: 'boolean',
    desc: 'enable debug output'
  })
  .options('h', {
    alias: 'help',
    type: 'boolean',
    desc: 'show help'
  });

if (cmdline.argv.help) {
  cmdline.showHelp();
  process.exit(0);
}

Object.keys(ENV).forEach(function(k) { process.env[k] = ENV[k]; });

if (cmdline.argv.debug)
  process.env['DEBUG'] = '';

var client = require('../models');

async.series([
  client.db.dropDatabase.bind(client.db),
  function runTests(cb) {
    client.db.close();

    var testFilenames = cmdline.argv._;
    var testDir = path.resolve(__dirname, '..', 'tests');
    var tapPath = path.resolve(__dirname, '..', 'node_modules', '.bin',
                               'tap');
    var tapArgs = ['--timeout=10', '--tap', '--stderr'];
    var colorizePath = path.resolve(__dirname, 'colorize-tap-output.js');
    var filter = function passThrough(f) { return true; };

    if (testFilenames.length) {
      tapArgs = tapArgs.concat(testFilenames);
    } else {
      if (cmdline.argv.filter)
        filter = (function createRegexpFilter(regexp) {
          return function(f) { return regexp.test(f); }
        })(new RegExp(cmdline.argv.filter));
      fs.readdirSync(testDir)
        .filter(function(f) { return /\.test\.js$/.test(f) })
        .filter(filter)
        .forEach(function(f) {
          var absPath = path.resolve(testDir, f);
          var relPath = path.relative(process.cwd(), absPath);
          tapArgs.push(relPath);
        });
    }

    var tap = spawn(tapPath, tapArgs);
    var colorize = spawn(colorizePath, []);

    tap.stdout.pipe(colorize.stdin);
    tap.stderr.pipe(process.stderr);
    colorize.stdout.pipe(process.stdout);
    colorize.stderr.pipe(process.stderr);
    colorize.on('close', function(code) {
      if (code)
        return process.exit(code);
      cb();
    });
  }
]);
