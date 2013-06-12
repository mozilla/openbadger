var s3;

const IS_TESTING = (process.env.NODE_ENV === 'test' ||
                    process.env.NODE_ENV === 'travis');
if (IS_TESTING && !process.env["OPENBADGER_AWS_FAKE_S3_DIR"]) {
  process.env["OPENBADGER_AWS_FAKE_S3_DIR"] = __dirname +
                                              '/../s3-fake-storage';
}

const S3_REQUIRED_ENV_VARS = [
  "OPENBADGER_AWS_KEY",
  "OPENBADGER_AWS_SECRET",
  "OPENBADGER_AWS_BUCKET"
];
const USE_FAKE_S3 = (process.env['NODE_ENV'] == 'development' ||
                     IS_TESTING) &&
                    process.env["OPENBADGER_AWS_FAKE_S3_DIR"];
if (USE_FAKE_S3) {
  var FakeS3 = require('./s3-fake');
  s3 = new FakeS3(process.env["OPENBADGER_AWS_FAKE_S3_DIR"]);
} else {
  var knox = require('knox');
  S3_REQUIRED_ENV_VARS.forEach(function(name) {
    if (!process.env[name])
      throw new Error("missing environment var " + name + ", please " +
                      "define it or specify OPENBADGER_AWS_FAKE_S3_DIR");
  });
  s3 = knox.createClient({
    key:    process.env["OPENBADGER_AWS_KEY"],
    secret: process.env["OPENBADGER_AWS_SECRET"],
    region: process.env["OPENBADGER_AWS_REGION"],
    bucket: process.env["OPENBADGER_AWS_BUCKET"]
  });
}

module.exports = s3;
