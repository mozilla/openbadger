const test = require('./');
const db = require('../models');
const util = require('../lib/util');
const env = require('../lib/environment');
const Work = require('../models/work');

test.applyFixtures({
  'email1': new Work({
    _id: 'first',
    type: 'email',
    created: new Date('2013-07-02'),
    data: {
      email: 'user@example.org',
      contents: 'hi hi hi',
    }
  }),
  'email2': new Work({
    _id: 'second',
    type: 'email',
    created: new Date('2013-07-03'),
    data: {
      email: 'user@example.org',
      contents: 'bye bye bye',
    }
  }),
  'task1': new Work({
    _id: 't1',
    type: 'task',
    created: new Date('2013-07-02'),
    data: {
      value: 1,
    }
  }),
  'task2': new Work({
    _id: 't2',
    type: 'task',
    created: new Date('2013-07-03'),
    data: {
      value: 2,
    }
  }),
  'task3': new Work({
    _id: 't3',
    type: 'task',
    created: new Date('2013-07-04'),
    data: {
      value: 3,
    }
  }),
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

  test('Work#getTask: find work to do', function (t) {
    Work.getTask({type: 'email'}, function (err, task, complete) {
      t.same(task._id, 'first');
      console.log('sending email', task.data.contents);
      complete('error', function (err, task) {
        t.same(task.status, 'error');
        Work.getTask({type: 'email'}, function (err, task, complete) {
          t.same(task._id, 'second');
          t.end();
        });
      });
    });
  });

  test('Work#getTask: fail gracefully when there is no work', function (t) {
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

  test('Work#runQueue: given a function, apply that function to the queue in series', function (t) {
    Work.runQueue({type: 'task'}, function (task, next) {
      // simulate work
      process.nextTick(function () {
        return next(null, task.data.value);
      });

    }, function (err, results) {
      t.same(results, [1,2,3], 'should have expected values');

      // cleanup
      Work.reset({type: 'task'}, t.end.bind(t));
    });
  });

  test('Work#runQueue: stop on first error', function (t) {
    const expectedError = new Error('ghosts cloggin up the gears');
    Work.runQueue('task', function (task, next) {

      return next(expectedError);

    }, function (err, results) {
      t.same(err, expectedError);
      Work.findById('t1', function (err, task) {
        t.same(task.status, 'error');
        Work.findById('t2', function (err, task) {
          t.same(task.status, 'waiting');

          Work.reset({type: 'task'}, t.end.bind(t));
        });
      });
    });
  });


  test('shutting down #', function (t) {
    db.close(); t.end();
  });
});
