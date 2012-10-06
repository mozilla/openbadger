var http = require('http');
var app = require('./app');
module.exports = http.createServer(app);