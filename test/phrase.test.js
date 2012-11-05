var test = require('tap').test;
var phrases = require('../lib/phrases');

test('phrases', function (t) {
  var count = 10;
  var phraseList = phrases(count);
  console.log(phraseList.join('\n'))
  t.same(phraseList.length, count);
  t.end();
});
