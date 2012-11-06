function fileToArray(file) {
  return (
    fs.readFileSync(__dirname + '/' +file)
      .toString()
      .trim()
      .split('\n')
  );
}

const sandwich = require('sandwich');
const fs = require('fs');
const ADVERBS = fileToArray('adverbs.txt');
const ADJECTIVES = fileToArray('adjectives.txt');
const NOUNS = fileToArray('nouns.txt');
const generator = sandwich(ADVERBS, ADJECTIVES, NOUNS);

module.exports = function phrases(count) {
  const matches = {}
  const results = []
  var length = 0;
  var word;
  while (length < count) {
    word = generator.random().join('-');
    if (!matches[word]) {
      matches[word] = results.push(word);
      length++;
    }
  }
  return results;
};