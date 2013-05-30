const path = require('path');
const sandwich = require('sandwich');
const fs = require('fs');

// The alphanumeric characters, minus ones that are very similar to each
// other in many fonts: l, I, 1, 0, and O.
const ALPHABET = ('abcdefghijkmnopqrstuvwxyz' +
                  'ABCDEFGHJKLMNPQRSTUVWXYZ' +
                  '23456789').split('');

const NUM_WORDS = 4;

const iterator = sandwich(ALPHABET, ALPHABET, ALPHABET, ALPHABET);

function phrases(count) {
  const matches = {};
  const results = [];
  var length = 0;
  var word;
  while (length < count) {
    word = [];
    for (var i = 0; i < NUM_WORDS; i++) {
      word.push(iterator.random().join(''));
    }
    word = word.join('-');
    if (!matches[word]) {
      matches[word] = results.push(word);
      length++;
    }
  }
  return results;
}

phrases.iterator = iterator;
phrases.NUM_WORDS = NUM_WORDS;
module.exports = phrases;
