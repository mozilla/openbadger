const DeletionRecord = require('../models/deletable').Record;

module.exports = function(req, res, next) {
  DeletionRecord.findOne({
    _id: req.param('undoId')
  }, function(err, record) {
    if (err) return next(err);
    if (!record) return res.send(404);
    record.undo(function(err) {
      if (err) return next(err);
      return res.redirect(303, 'back');
    });
  });
};

module.exports.records = function(req, res, next) {
  DeletionRecord.find(function(err, records) {
    if (err) return next(err);
    req.records = records;
    next();
  });
};
