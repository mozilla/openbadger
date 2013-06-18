var _ = require('underscore');

module.exports = function Deletable(model) {
  var superClass = {
    find: model.find,
    findOne: model.findOne
  };

  model.find = function find(conditions, fields, options, callback) {
    if ('function' == typeof conditions) {
      callback = conditions;
      conditions = {};
      fields = null;
      options = null;
    }

    conditions = _.defaults(conditions, {deleted: {$ne: true}});

    return superClass.find.call(this, conditions, fields, options, callback);
  };

  model.findOne = function findone(conditions, fields, options, callback) {
    if ('function' == typeof conditions) {
      callback = conditions;
      conditions = {};
      fields = null;
      options = null;
    }

    conditions = _.defaults(conditions, {deleted: {$ne: true}});

    return superClass.findOne.call(this, conditions, fields, options,
                                   callback);
  };

  return model;
};
