var http = require('http');
var app = require('./app');
var server = module.exports = http.createServer(app);

if (!module.parent) {
  server.listen(app.get('port'), function() {
    app.logger.info("Express server listening on port " + app.get('port'));
  });
}
