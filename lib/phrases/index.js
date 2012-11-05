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
  const results = [];
  while (count--)
    results.push(generator.random().join('-'));
  return results;
};