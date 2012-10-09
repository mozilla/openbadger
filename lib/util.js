var util = require('util');
util.slugify = function slugify(string) {
  return string
    .toLowerCase()
    .replace(/[\s\-]+/g, '-')
    .replace(/[^a-z0-9_\-]/gi, '');
};
module.exports = util;