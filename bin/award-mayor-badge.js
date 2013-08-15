#!/usr/bin/env node

var async = require('async');
var db = require('../models');
var Badge = require('../models/badge');
var BadgeInstance = require('../models/badge-instance');
var _ = require('underscore');

const MAYOR_BADGE_SHORTNAME = 'city-of-chicago-mayors-badge';

const REQUIRED_BADGES = [ 'city-of-chicago-science',
                          'city-of-chicago-technology',
                          'city-of-chicago-engineering',
                          'city-of-chicago-art',
                          'city-of-chicago-math' ];

function handleError(err) {
  console.log('An error occurred: %s', err.message);
  db.close();
  process.exit(1);
}

Badge.findOne( { 'shortname' : MAYOR_BADGE_SHORTNAME }, function(err, mayorBadge) {
  if (err) {
    return handleError(err);
  }

  Badge.find( { 'shortname' : { '$in' : REQUIRED_BADGES } }, function(err, requiredBadges) {
    if (err) {
      return handleError(err);
    }

    var requiredBadgeIds = _.map(requiredBadges, function(badge) { return badge._id; });

    BadgeInstance.distinct('user', null, function(err, emails) {
      if (err) {
        return handleError(err);
      }

      async.forEachSeries(emails, function(email, callback) {
        BadgeInstance.find( { 'user' : email, 'badge' : { '$in' : requiredBadgeIds } }, function(err, prereqBadges) {
          if (err) {
            return callback(err);
          }

          if (prereqBadges.length >= REQUIRED_BADGES.length) {
            mayorBadge.award(email, function(err, instance) {
              if (err) {
                return handleError(err);
              }

              if (instance != null) {
                console.log("Awarded mayor's badge to " + email);
              }

              callback();
            });
          } else {
            callback();
          }
        });
      }, function(err) {
        if (err) {
          return handleError(err);
        }
        db.close();
      });
    });
  });
});

