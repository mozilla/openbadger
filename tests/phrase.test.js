var test = require('./');
var phrases = require('../lib/phrases');

function dedupe(array) {
  const matches = {};
  const results = [];
  var idx = array.length;
  var word;
  while (idx--) {
    word = array[idx];
    if (!matches[word])
      matches[word] = results.unshift(word);
  }
  return results;
}

test('generating a whole bunch of phrases', function (t) {
  var count = 100000;

  test.clock.start('phrase generation');
  var words = phrases(count);
  test.clock.stop();

  test.clock.start('counting duplicates');
  var result = dedupe(words).length;
  test.clock.stop();

  t.same(result, count);
  t.end();
});
