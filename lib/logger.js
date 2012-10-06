var env = require('habitat')('openbadger');
var winston = require('winston');
var pathutil = require('path');

var logdir = env.get('logdir', '.');
var filename = pathutil.join(logdir, 'openbadger.log');

var logger = new (winston.Logger)({
  transports: [new (winston.transports.File)({
    filename: filename,
    colorize: false,
    timestamp: true
  })]
});

logger.add(winston.transports.Console, {
  colorize: true,
  timestamp: true
});

module.exports = logger;
