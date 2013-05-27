#!/usr/bin/env node

const CHECKMARK = "\u2713";

var colors = require("colors");

function colorizeTapOutput(options) {
  var tc = options.tapConsumer;
  var log = options.log || console.log.bind(console);
  var testFileRegexp = options.testFileRegexp || /^$/;
  var debug = options.debug;
  var passed = 0;
  var failed = 0;
  var currentTest = {
    name: "",
    total: 0,
    failed: []
  };
  var lastOutput = null;

  tc.on("bailout", function(info) {
    log("BAILOUT".red, info);
    process.exit(1);
  });
  tc.on("data", function (c) {
    if (typeof(c) == "object") {
      if (debug)
        log("DEBUG".magenta, JSON.stringify(c, null, 2).grey);
      if (c.ok) {
        currentTest.total++;
        passed++;
      } else {
        if (c.timedOut)
          log("TIMEOUT".red, c.name.trim());
        if (c.exit)
          process.exit(c.exit);
        currentTest.failed.push(c);
        failed++;
      }
    } else {
      if (debug) log("DEBUG".magenta, c.grey);
      if (currentTest.total) {
        if (currentTest.name &&
            currentTest.name != "ok" &&
            !currentTest.name.match(/^fail[0-9\s]+$/)) {

          if (currentTest.failed.length) {
            log("x".red, currentTest.name.grey);
            log();
            currentTest.failed.forEach(function(c) {
              log("  " + c.name.trim(), "failure".grey);
              if (c.found && c.wanted) {
                log("  found ".grey, JSON.stringify(c.found));
                log("  wanted".grey, JSON.stringify(c.wanted));
              }
              if (c.stack) {
                log("\n  Traceback (most recent call first):".grey);
                c.stack.forEach(function(line) {
                  log("    " + (line.match(testFileRegexp)
                                ? line.white
                                : line.grey));
                });
              } else if (c.file) {
                log("  @ ".grey + c.file + ":".grey + c.line);
              }
              log();
            });
          } else {
            log(CHECKMARK.green, currentTest.name.grey);
          }
          currentTest.name = "";
        }
        currentTest.total = 0;
        currentTest.failed = [];
      }
      currentTest.name = c;
    }
  });
  tc.on("end", function () {
    var total = passed + failed;
    var count = passed + "/" + total;
    log("\nTests passed:", passed == total ? count.green : count.red);
    process.exit(failed);
  });
}

function colorizeStdin() {
  var tapConsumer = new (require("tap/lib/tap-consumer"));

  colorizeTapOutput({
    debug: 'DEBUG' in process.env,
    tapConsumer: tapConsumer,
    testFileRegexp: /\.test\.js/
  });

  process.stdin.setEncoding('utf8');
  process.stdin.pipe(tapConsumer);
}

module.exports = colorizeTapOutput;

if (!module.parent) colorizeStdin();
