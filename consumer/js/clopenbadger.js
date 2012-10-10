"use strict";

define(["jquery", "backbone-events"], function($, BackboneEvents) {
  return function Clopenbadger(options) {
    var server = options.server;
    var token = options.token;
    var email = options.email;
    var self = {
      availableBadges: {},
      earnedBadges: {}
    };
    
    BackboneEvents.mixin(self);

    $.getJSON(server + '/v1/badges', function(data) {
      // TODO: Check for errors.
      self.availableBadges = data.badges;
      self.trigger("change:availableBadges");
    });

    $.getJSON(server + '/v1/user', {
      auth: token,
      email: email
    }, function(data) {
      // TODO: Check for errors.
      self.earnedBadges = data.badges;
      self.trigger("change:earnedBadges");
    });
    
    return self;
  };
});
