"use strict";

define(["jquery", "backbone-events"], function($, BackboneEvents) {
  function countUnreadBadges(earned) {
    var unread = 0;
    Object.keys(earned).forEach(function(shortname) {
      if (!earned[shortname].isRead)
        unread++;
    });
    return unread;
  }
  
  function updateunreadBadgeCount(badger) {
    var unreadBadgeCount = countUnreadBadges(badger.earnedBadges);
    if (unreadBadgeCount !== badger.unreadBadgeCount) {
      badger.unreadBadgeCount = unreadBadgeCount;
      badger.trigger("change:unreadBadgeCount");
    }
  }
  
  return function Clopenbadger(options) {
    var server = options.server;
    var token = options.token;
    var email = options.email;
    var self = {
      availableBadges: undefined,
      earnedBadges: undefined,
      unreadBadgeCount: undefined,
      markAllBadgesAsRead: function() {
        if (self.unreadBadgeCount == 0)
          return;
        $.ajax({
          type: 'POST',
          url: server + '/v1/user/mark-all-badges-as-read',
          dataType: 'json',
          data: {
            auth: token,
            email: email
          },
          success: function(data) {
            // TODO: Check for errors.
            if (data.status == "ok") {
              Object.keys(self.earnedBadges).forEach(function(shortname) {
                self.earnedBadges[shortname].isRead = true;
              });
              updateunreadBadgeCount(self);
              self.trigger("change:earnedBadges");
            }
          }
        });
      },
      credit: function(shortname) {
        // TODO: Should we wait for available/earned badges to be registered
        // before sending this?
        $.ajax({
          type: 'POST',
          url: server + '/v1/user/behavior/' + shortname + '/credit',
          dataType: 'json',
          data: {
            auth: token,
            email: email
          },
          success: function(data) {
            // TODO: Check for errors.
            if (data.status == "awarded") {
              $.extend(self.earnedBadges, data.badges);
              updateunreadBadgeCount(self);
              self.trigger("change:earnedBadges");
              self.trigger("award", Object.keys(data.badges));
            }
          }
        });
      }
    };
    
    BackboneEvents.mixin(self);

    var availableReq = $.getJSON(server + '/v1/badges', function(data) {
      // TODO: Check for errors.
      self.availableBadges = data.badges;
    });

    var earnedReq = $.getJSON(server + '/v1/user', {
      auth: token,
      email: email
    }, function(data) {
      // TODO: Check for errors.
      self.earnedBadges = data.badges;
    });
    
    $.when(availableReq, earnedReq).done(function() {
      updateunreadBadgeCount(self);
      self.trigger("change:availableBadges");
      self.trigger("change:earnedBadges");
    });
    
    return self;
  };
});
