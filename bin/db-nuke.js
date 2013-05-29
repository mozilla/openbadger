#!/usr/bin/env node

var colors = require('colors');
var optimist = require('optimist');
var prompt = require('prompt');
var util = require('util');
var client = require('../models');

var db = 'mongodb://' + client.db.serverConfig.host + ':' +
                        client.db.serverConfig.port + '/' +
                        client.db.databaseName;

var argv = optimist
  .usage('Usage: $0 [options]')
  .describe('force', 'Run without prompting for confirmation')
  .alias('f', 'force')
  .boolean('force')

  .alias('h', 'help')
  .alias('h', '?')
  .boolean('h')
  .argv;

if (argv.help) {
  optimist.showHelp();
  process.exit(1);
}

function run(cb) {
  client.db.dropDatabase(function(err) {
    if (err) throw err;
    cb();
  });
}

function warning() {
  var msg = 'This command will '
    + 'LOSE ALL DATA'.bold.underline
    + ' in `' + db + '`!'
    + ' Proceed?';
  return msg.red;
}

prompt.start();
prompt.message = prompt.delimiter = '';

var property = {
  name: 'permission',
  message: warning(),
  validator: /^(y(es)?|no?)$/i,
  warning: 'Must respond yes or no',
  default: 'no'
};

if (argv.force) {
  prompt.override = {
    permission: 'Y'
  };
}

prompt.get(property, function(err, result) {
  if (err) throw err;
  if (result.permission.match(/^y/i)) {
    run(function(){
      console.log('💥  ' + 'Nuked!'.yellow);
      client.db.close();
    });
  }
  else {
    console.log('Aborted'.yellow);
    client.db.close();
  }
});