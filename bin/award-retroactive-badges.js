#!/usr/bin/env node

var async = require('async');
var webhooks = require('../lib/webhooks');
var db = require('../models');
var Badge = require('../models/badge');
var BadgeInstance = require('../models/badge-instance');

BadgeInstance.distinct('user', null, function(err, emails) {
  async.forEach(emails, function(email, callback) {
    console.log('Checking for earned badges for %s', email);
    Badge.awardCategoryBadges( {email: email, sendEmail: true}, function(err, instances) {
      if (err) {
        return callback(err);
      }

      async.forEach(instances, function(instance, cb) {
        instance.populate('badge', function (err) {
          if (err) {
           console.log("Couldn't populate badge instance %s", instance.id);
           return cb(err);
          }

          console.log('Awarded badge %s to %s', instance.badge.shortname, email);
          webhooks.notifyOfAwardedBadge(email, instance.badge.shortname, cb);
        });
      }, callback);
    });
  }, function(err) {
    if (err) {
      console.log('An error occurred: %s', err.message);
    }
    db.close();
  });
});

