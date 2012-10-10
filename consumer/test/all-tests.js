"use strict";

defineTests([
  "jquery",
  "test/fake-server",
  "clopenbadger"
], function($, Server, Clopenbadger) {
  var badger;
  var fakeServerURL = "http://clopenbadger";
  var availableBadges = {
    "FIRST_LOGIN": {
      "name": "First Login",
      "description": "Like a champion, you logged in...",
      "criteria": "Can log into a site that uses Persona for auth.",
      "image": "https://wiki.mozilla.org/images/b/bb/Merit-badge.png",
      "behavior": "LOGGED_IN",
      "score": "1",
      "prerequisites": []
    }
  };

  module("clopenbadger", {
    setup: function() {
      Server.setup({
        urlPrefix: fakeServerURL,
        availableBadges: availableBadges
      });
      badger = Clopenbadger({
        server: fakeServerURL,
        token: JSON.stringify({prn: "foo@bar.org"}),
        email: "foo@bar.org"
      });
    }
  });
  
  asyncTest("change:availableBadges is broadcast", function() {
    badger.on('change:availableBadges', function() {
      deepEqual(badger.availableBadges, availableBadges,
                "badger.availableBadges matches our expectations");
      start();
    });
  });
  
  asyncTest("change:earnedBadges is broadcast", function() {
    var available = false;
    badger.on('change:availableBadges', function() { available = true; });
    badger.on('change:earnedBadges', function() {
      ok(available, "change:availableBadges is always triggered first");
      deepEqual(badger.earnedBadges, {},
                "badger.earnedBadges matches our expectations");
      start();
    });
  });
});
