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
  
  return {
    setup: function setup(options) {
      var urlPrefix = options.urlPrefix;
      var availableBadges = options.availableBadges || {};
      
      transport = function(options, originalOptions, jqXHR) {
        if (options.url.indexOf(urlPrefix) != 0)
          return;

        var path = originalOptions.url.slice(urlPrefix.length);
        var authInfo = {prn: ""};
        
        if (originalOptions.data && originalOptions.data.auth)
          authInfo = JSON.parse(originalOptions.data.auth);
        return {
          send: function(headers, completeCallback) {
            function respond(status, statusText, responses, headers) {
              setTimeout(function() {
                completeCallback(status, statusText, responses, headers);
              }, 0);
            }
            
            function respondWithJSON(obj) {
              return respond(200, "OK", {json: copyObject(obj)}, {
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
});
