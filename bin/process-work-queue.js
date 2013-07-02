#!/usr/bin/env node

const env = require('../lib/environment');
const Work = require('../models/work');

Work.processIssueQueue(function (err, results) {
  if (err) throw err;
  console.log('completed', results.length, 'tasks');
  process.exit(0);
});
