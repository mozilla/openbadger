"use strict";

define(["jquery"], function($) {
  function copyObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  var transport = function() {};
  
  // http://api.jquery.com/extending-ajax/#Transports
  $.ajaxTransport("+*", function(options, originalOptions, jqXHR) {
    return transport(options, originalOptions, jqXHR);
  });
  
  var self = {
    availableBadges: {},
    earnedBadges: {},
    behaviors: {},
    queuedAward: null,
    queueAward: function(badges) {
      this.queuedAward = badges;
    },
    setup: function setup(options) {
      var urlPrefix = options.urlPrefix;
      var availableBadges = options.availableBadges || {};
      var behaviors = options.behaviors || {};
      var earnedBadges = options.earnedBadges || {};
      
      this.availableBadges = availableBadges;
      this.behaviors = behaviors;
      this.earnedBadges = earnedBadges;
      this.queuedAward = null;
      
      transport = function(options, originalOptions, jqXHR) {
        if (options.url.indexOf(urlPrefix) != 0)
          return;

        var path = originalOptions.url.slice(urlPrefix.length);
        var authInfo = {prn: ""};

        console.log(options.type, options.url);
        if (originalOptions.data && originalOptions.data.auth)
          authInfo = JSON.parse(originalOptions.data.auth);
        return {
          send: function(headers, completeCallback) {
            function respond(status, statusText, responses, headers) {
              setTimeout(function() {
                completeCallback(status, statusText, responses, headers);
              }, 0);
            }
            
            function respondWithJSON(obj, status, statusText) {
              status = status || 200;
              statusText = statusText || "OK";
              return respond(status, statusText, {json: copyObject(obj)}, {
                'content-type': 'application/json'
              });
            }
            
            if (options.type == "GET") {
              if (path == "/v1/badges") {
                return respondWithJSON({
                  status: "ok",
                  badges: availableBadges
                });
              } else if (path == "/v1/user") {
                if (authInfo.prn != originalOptions.data.email)
                  throw new Error("email param != JWT claim set principal");
                return respondWithJSON({
                  status: "ok",
                  behaviors: {},
                  badges: {}
                });
              }
            } else if (options.type == "POST") {
              var shortnameRegexp = /^\/v1\/user\/behavior\/(.*)\/credit$/;
              var creditMatch = path.match(shortnameRegexp);
              if (creditMatch) {
                var shortname = creditMatch[1];
                if (!behaviors[shortname])
                  behaviors[shortname] = 0;
                behaviors[shortname]++;
                if (self.queuedAward) {
                  var awardedBadges = self.queuedAward;
                  self.queuedAward = null;
                  return respondWithJSON({
                    status: "awarded",
                    badges: awardedBadges
                  }, 201, "Created");
                } else
                  return respondWithJSON({
                    status: "ok"
                  });
              }
            }
            
            return respond(404, "Not Found", {
              text: "Not found: " + path
            }, {
              'content-type': 'text/plain'
            });
          },
          abort: function() {
            throw new Error("abort() is not implemented!");
          }
        };
      };
    }
  };
  
  return self;
});
