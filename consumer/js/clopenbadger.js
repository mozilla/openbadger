"use strict";

define(["jquery", "backbone-events"], function($, BackboneEvents) {
  return function Clopenbadger(options) {
    var server = options.server;
    var token = options.token;
    var email = options.email;
    var self = {
      availableBadges: {},
      earnedBadges: {},
      credit: function(shortname) {
        $.ajax({
          type: 'POST',
          url: server + '/v1/user/behavior/' + shortname + '/credit',
          dataType: 'json',
          success: function(data) {
            // TODO: Check for errors.
            if (data.status == "awarded") {
              $.extend(self.earnedBadges, data.badges);
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
      self.trigger("change:availableBadges");
      self.trigger("change:earnedBadges");
    });
    
    return self;
  };
});
