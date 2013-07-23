const _ = require('underscore');
const db = require('./');
const async = require('async');
const Schema = require('mongoose').Schema;
const util = require('../lib/util');

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
  if (typeof query == 'string')
    query = { type: query };
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

Work.reset = function reset(query, outerCallback) {
  Work.find(query, function (err, tasks) {
    if (err) return outerCallback(err);
    async.mapSeries(tasks, function (task, innerCallback) {
      task.status = 'waiting';
      task.save(innerCallback);
    }, outerCallback);
  });
};

Work.runQueue = function runQueue(query, workFn, callback) {
  // workFn gets called with two args: (task, nextFn)
  // nextFn expects two args: (err, result)
  // callback gets called with two args: (err, results)

  const results = [];

  function makeNextFn(taskComplete) {
    return function next(err, result) {
      if (err) return taskComplete('error', callback.bind(null, err));
      taskComplete('done', function (err) {
        if (err) return callback(err);
        results.push(result);
        return getNextTask();
      });
    };
  }

  function getNextTask() {
    Work.getTask(query, function (err, task, taskComplete) {
      if (err) return callback(err);
      if (!task) return callback(null, results);
      return workFn(task, makeNextFn(taskComplete));
    });
  }

  getNextTask();
};

Work.processIssueQueue = function processIssueQueue(callback) {
  const Badge = require('./badge');
  const queueName = 'issue-badge';

  const isEmail = util.isEmail;

  Work.runQueue(queueName, function (task, next) {
    const email = task.data.email;
    const issuedBy = task.data.issuedBy;
    const badgeId = task.data.badge;

    Badge.findById(badgeId, function (err, badge) {
      if (err) return next(err);
      if (!isEmail(email))
        return next(null, {email: email, status: 'invalid'});
      badge.reserveAndNotify({
        email: email,
        issuedBy: issuedBy,
      }, function (err, claimCode) {
        if (err) return next(err);
        if (!claimCode)
          return next(null, {email: email, status: 'dupe'});
        return next(null, {
          email: email,
          status: 'ok',
          claimCode: claimCode
        });
      });
    });
  }, callback);
};
