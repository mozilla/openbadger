var winston = require('winston');
var pathutil = require('path');
var env = require('./environment');

var logger = new (winston.Logger)({
  transports: [new (winston.transports.Console)({
    colorize: false,
    timestamp: true
  })]
});

module.exports = logger;
