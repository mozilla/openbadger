const bunyan = require('bunyan');

const log = module.exports = bunyan.createLogger({
  name: 'openbadger',
  stream: process.stdout,
  level: 'info',
  serializers: {
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res
  }
});

// We want to use process.stdout exclusively for the application event
// stream. To prevent errant `console.log`s from sneaking into stdout,
// we want to make sure that the console object only knows about stderr.
if (!console._stdout)
  throw new Error('The internals of `console` have changed, could not find console._stdout.\n' +
                  'Check node/lib/console.js for the updated internal structure.');
console._stdout = process.stderr;


// Normal uncaught exception handling outputs the stacktrace to the
// console before exiting with a non-zero status. This is *almost* what
// we want, except we also want to make sure it ends up in the
// application's event stream as a fatal event.
process.once('uncaughtException', function (err) {
  log.fatal(err);
  throw err;
});
