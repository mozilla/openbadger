var winston = require('winston');
var pathutil = require('path');
var env = require('./environment');

var logger = new (winston.Logger)({
  transports: [new (winston.transports.Console)({
    colorize: false,
    timestamp: true
  })]
});

if (env.get('logdir')){
  var logdir = env.get('logdir', '.');
  var filename = pathutil.join(logdir, 'openbadger.log');

  logger.add(new (winston.transports.File)({
    filename: filename,
    colorize: false,
    timestamp: true
  }));
}

module.exports = logger;
