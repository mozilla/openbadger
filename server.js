var http = require('http');
var app = require('./app');
var util = require('util');
var server = module.exports = http.createServer(app);

console.log('Environment: \n' + util.inspect(app.env.all()));
if (!module.parent) {
  server.listen(app.get('port'), function () {
    app.logger.info("Express server listening on port " + app.get('port'));
  });
}
