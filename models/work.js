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
    'enum': ['email']
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


Work.getTask = function (query, callback) {
  const ASCENDING_ORDER = 1;
  query = _.extend(query, { status: 'waiting' });
  Work.findOneAndUpdate(
    query,
    { status: 'started' },
    { created: ASCENDING_ORDER },
    function (err, task) {
      if (err) return callback(err);
      return callback(null, task, function complete(cb) {
        if (!task) return cb();
        Work.findByIdAndUpdate(task._id, { status: 'done' }, cb);
      });
    });
};
