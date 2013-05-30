var _ = require('underscore');

var test = require('./');
var phrases = require('../lib/phrases');

test('phrases contain no duplicates', function (t) {
  var count = 100;

  test.clock.start('phrase generation');
  var words = phrases(count);
  test.clock.stop();

  test.clock.start('counting duplicates');
  var result = _.uniq(words).length;
  test.clock.stop();

  t.same(result, count);
  t.end();
});

test('phrases contain expected # of words w/ alphanumerics', function (t) {
  var phrase = phrases(1)[0];

  var words = phrase.split('-');

  t.equal(words.length, phrases.NUM_WORDS);

  words.forEach(function(word) {
    if (!/^[A-Za-z0-9]+$/.test(word))
      throw new Error("word has non-alphanumeric chars: " + word);
  });

  t.end();
});
