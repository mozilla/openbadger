const test = require('./');
const db = require('../models');
const util = require('../lib/util');
const env = require('../lib/environment');
const Work = require('../models/work');

test.applyFixtures({
  'email1': new Work({
    _id: 'first',
    type: 'email',
    data: {
      email: 'user@example.org',
      contents: 'hi hi hi',
    }
  }),
  'email2': new Work({
    _id: 'second',
    type: 'email',
    data: {
      email: 'user@example.org',
      contents: 'bye bye bye',
    }
  })
}, function (fx) {
  test('find work manually', function (t) {
    Work.findOneAndUpdate(
      {type: 'email'},
      {status: 'started'},
      {created: 1},
      function (err, task) {
        t.same(task._id, 'first');
        t.same(task.status, 'started');

        // reset
        Work.findByIdAndUpdate(task._id, {status: 'waiting'}, function () {
          t.end();
        });
    });
  });

  test('find work to do', function (t) {
    Work.getTask({type: 'email'}, function (err, task, complete) {
      t.same(task._id, 'first');
      console.log('sending email', task.data.contents);
      complete(function (err, task) {
        t.same(task.status, 'done');
        Work.getTask({type: 'email'}, function (err, task, complete) {
          t.same(task._id, 'second');
          t.end();
        });
      });
    });
  });

  test('fail gracefully when there is no work', function (t) {
    Work.getTask({type: 'nope nope nope'}, function (err, task, complete) {
      t.notOk(err, 'no errors');
      t.notOk(task, 'no tasks');
      complete(function (err, task) {
        t.notOk(err, 'no errors');
        t.notOk(task, 'no tasks');
        t.end();
      });
    });
  });


  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
