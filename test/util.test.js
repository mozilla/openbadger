var test = require('./');
var util = require('../lib/util');

test('util.slugify', function (t) {
  var input = 'RaD    to the Max';
  var expect = 'rad-to-the-max';
  var result = util.slugify(input);
  t.same(result, expect);
  t.end();
});


test('util.sha256', function (t) {
  var crypto = require('crypto');
  var sum = crypto.createHash('sha256')
  var expect = 'sha256$' + sum.update('awesomerad').digest('hex');
  var result = util.sha256('awesome', 'rad');
  t.same(result, expect);
  t.end();
});
