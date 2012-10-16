var test = require('./');
var env = require('../lib/environment');

env.temp({
  protocol: 'https',
  host: 'example.org',
  port: '443',
}, function (reset) {

  test('env.qualifyUrl', function (t) {
    var expect = 'https://example.org:443/rad?level=maximum';
    var result = env.qualifyUrl('/rad?level=maximum');
    t.same(result, expect);
    t.end();
  });

  test('env.origin', function (t) {
    var expect = 'https://example.org:443';
    var result = env.origin();;
    t.same(result, expect);
    t.end();
  });
});
