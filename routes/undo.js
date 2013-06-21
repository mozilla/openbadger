const _ = require('underscore');
const DeletionRecord = require('../models/deletable').Record;

module.exports = function(req, res, next) {
  DeletionRecord.findOne({
    _id: req.param('undoId')
  }, function(err, record) {
    if (err && err.name == 'CastError' && err.type == 'ObjectId')
      return res.send(404);
    if (err) return next(err);
    if (!record) return res.send(404);
    record.undo(function(err) {
      if (err) return next(err);
      return res.redirect(303, 'back');
    });
  });
};

module.exports.findAll = function(req, res, next) {
  DeletionRecord.find(function(err, records) {
    if (err) return next(err);
    req.undoRecords = records;
    next();
  });
};

module.exports.undoablyDelete = function(prop) {
  return function(req, res, next) {
    var document = req[prop];
    var modelName = document.constructor.modelName;
    document.undoablyDelete(function(err, record) {
      if (err) return next(err);
      req.flash('info', {
        template: 'messages/deletion.html',
        info: {
          name: record.name,
          id: record._id
        }
      });
      res.send(200, modelName + " undoably deleted.");
    });
  };
};
