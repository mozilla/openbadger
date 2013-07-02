const _ = require('underscore');
const db = require('./');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const WorkSchema = new Schema({
  _id: {
    type: String,
    unique: true,
    required: true,
    default: db.generateId,
  },
  type: {
    type: String,
    trim: true,
    required: true,
  },
  created: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updated: {
    type: Date,
  },
  status: {
    type: String,
    trim: true,
    required: true,
    default: 'waiting',
    'enum': ['waiting', 'started', 'done', 'error'],
  },
  data: Schema.Types.Mixed
});

const Work = db.model('Work', WorkSchema);
module.exports = Work;


Work.getTask = function getTask(query, callback) {
  const ASCENDING_ORDER = 1;
  query = _.extend(query, { status: 'waiting' });
  Work.findOneAndUpdate(query, { status: 'started' })
    .sort('created')
    .exec(function (err, task) {
      if (err) return callback(err);
      return callback(null, task, function complete(status, cb) {
        if (typeof status == 'function')
          cb = status, status = 'done';
        if (!task) return cb();
        Work.findByIdAndUpdate(task._id, { status: status }, cb);
      });
    });

};

Work.runQueue = function runQueue(query, workFn, callback) {
  const results = [];

  function next(markCompleted) {
    return function (err, result) {
      if (err) return markCompleted('error', callback.bind(null, err));
      markCompleted('done', function (err) {
        if (err) return callback(err);
        results.push(result);
        return getNextTask();
      });
    };
  }

  function getNextTask() {
    Work.getTask(query, function (err, task, complete) {
      if (err) return callback(err);
      if (!task) return callback(null, results);
      return workFn(task, next(complete));
    });
  }

  getNextTask();
};
