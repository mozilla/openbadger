const bunyan = require('bunyan');

const log = module.exports = bunyan.createLogger({
  name: 'openbadger',
  stream: process.stdout,
  level: 'info',
  serializers: {
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res,
    program: function (p) {
      return {
        shortname: p.shortname,
        name: p.name,
        description: p.description,
        url: p.url,
        contact: p.contact,
        startDate: p.startDate,
        endDate: p.endDate,
        phone: p.phone,
        issuer: p.issuer,
      };
    }
  }
});

// Patch console so it only outputs to stderr
require('./console-patch');

// Normal uncaught exception handling outputs the stacktrace to the
// console before exiting with a non-zero status. This is *almost* what
// we want, except we also want to make sure it ends up in the
// application's event stream as a fatal event.
process.once('uncaughtException', function (err) {
  log.fatal(err);
  throw err;
});
