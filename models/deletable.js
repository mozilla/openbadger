var db = require('./');
var async = require('async');
var Schema = require('mongoose').Schema;
var _ = require('underscore');

const deletableModels = {};

const DeletionRecordSchema = new Schema({
  creationDate: {type: Date, default: Date.now},
  name: String,
  items: [{
    model: String,
    id: String
  }]
});

DeletionRecordSchema.methods.undo = function undoDeletion(cb) {
  var self = this;
  async.forEachSeries(this.items, function(item, cb) {
    deletableModels[item.model].findOneAndUpdate({
      _id: item.id
    }, {
      deleted: false
    }, cb);
  }, function(err) {
    if (err) return cb(err);
    self.remove(cb);
  });
};

const DeletionRecord = db.model('DeletionRecord', DeletionRecordSchema);

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

  if (!model.prototype.getDeletableChildren)
    model.prototype.getDeletableChildren = function(cb) {
      cb(null, []);
    };

  model.prototype.undoablyDelete = function(record, callback) {
    var self = this;
    if (typeof(record) == 'function') {
      callback = record;
      record = new DeletionRecord();
      record.name = model.modelName + " " +
                    JSON.stringify(this.name || this._id);
    }
    if (this.deleted)
      return callback(null, record);
    this.deleted = true;
    this.save(function(err) {
      if (err) return callback(err, record);
      record.items.push({
        model: model.modelName,
        id: self._id
      });
      record.save(function(err) {
        if (err) return callback(err, record);
        self.getDeletableChildren(function(err, objects) {
          if (err) return callback(err, record);
          async.forEachSeries(objects, function(object, cb) {
            object.undoablyDelete(record, cb);
          }, function(err) {
            callback(err, record);
          });
        });
      });
    });
  };

  deletableModels[model.modelName] = model;

  return model;
};

module.exports.Record = DeletionRecord;
