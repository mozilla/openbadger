const path = require('path');
const sandwich = require('sandwich');
const fs = require('fs');

// The lowercase alphanumeric characters, minus ones that are very similar
// to other letters/numbers in many fonts: l, 1, 0.
const ALPHABET = ('abcdefghijkmnopqrstuvwxyz23456789').split('');

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
