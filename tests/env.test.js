var test = require('./');
var env = require('../lib/environment');

env.temp({
  origin: 'https://example.org:443',
  admins: ['*@example.org', 'brian@mozillafoundation.org'],
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

  test('env.isAdmin', function (t) {
    t.same(env.isAdmin('brian@example.org'), true);
    t.same(env.isAdmin('anyone@example.org'), true);
    t.same(env.isAdmin('guy@bad-domain.org'), false);
    t.same(env.isAdmin('brian@mozillafoundation.org'), true);
    t.end();
  });
});
