# openbadger

[![Build Status](https://travis-ci.org/mozilla/openbadger.png)](https://travis-ci.org/mozilla/openbadger)

Badging.

At this point, the v2.0 branch of this repository is primarily
an administrative back-end for [CSOL-site][]. In the future,
we'll likely create a v3.0 branch that brings in the best of the
v2.0 branch and the development branch (which was created for [Thimble][]).

  [CSOL-site]: https://github.com/mozilla/CSOL-site/
  [Thimble]: https://github.com/mozilla/webpagemaker

# Prerequisites

Make sure you have [redis](http://redis.io) and [mongo](http://mongodb.org/)
installed or hosted somewhere. You'll also need node.

# Local configuration

Here is an example configuration. This assumes you are running redis
and mongo locally.

```bash
export NODE_ENV="development"
export THEME_DIR="themes/csol"
export OPENBADGER_AWS_FAKE_S3_DIR="s3-fake-storage"
export OPENBADGER_HOST="localhost"
export OPENBADGER_PROTOCOL="http"
export OPENBADGER_PORT=3000
export OPENBADGER_PERSONA_AUDIENCE="http://localhost:3000"
export OPENBADGER_LOGDIR='.'
export OPENBADGER_SECRET="badgerbadgerbadgerbadger"
export OPENBADGER_JWT_SECRET="badgerjwtsecret"
export OPENBADGER_LIMITED_JWT_SECRET="ihavelimitedaccess"
export OPENBADGER_REDIS_HOST="localhost"
export OPENBADGER_REDIS_PORT=6379
export OPENBADGER_MONGO_HOST="localhost"
export OPENBADGER_MONGO_PORT=27017
export OPENBADGER_MONGO_DB="openbadger"
export OPENBADGER_CLAIM_URL_TEXT='csol.org/claim'
export OPENBADGER_ADMINS='["*@mozilla(foundation)?.org"]'
export OPENBADGER_NOTIFICATION_WEBHOOK="http://localhost:3000/notify/"
```

You can either paste that directly into your terminal, or you can put
that in a file and `source` it. For example, if you save a version of
this at `config.env`, do:

```bash
$ source config.env
```

## Adding sample data

If you want to add some sample data so you don't need to create issuers,
programs, and badges from scratch, you can use the following command:

```bash
node bin/import-sample-data.js
```

## Using the Persona simulator

When developing locally without internet access, or trying out logging in
as multiple different email addresses, you may find it useful to enable
simulation of the Persona service via [stubbyid.js][]. When enabled, a
dialog box asking for your email address, with no password prompt, is all
that's required to log in as any user.

This feature can be used only when `NODE_ENV=development`, and can be
enabled by setting the `OPENBADGER_ENABLE_STUBBYID` environment variable to
any value (even the empty string).

  [stubbyid.js]: http://toolness.github.io/stubbyid/

## Using real S3 instead of fake S3

For production builds, you'll want to modify the above sample configuration
with the following:

```bash
unset OPENBADGER_AWS_FAKE_S3_DIR
export OPENBADGER_AWS_KEY="aewgaewgaweg"
export OPENBADGER_AWS_SECRET="zcvzncvzcbm"
export OPENBADGER_AWS_BUCKET="bucket-o-s3"
```

## Using memcached instead of redis for sessions
In some cases (such as deploying on AWS) it might be easier to use memcached rather than redis.

```bash
export OPENBADGER_MEMCACHED_HOSTS="127.0.0.1:11211"
```

Note the use of `HOSTS` in the plural – the memcached session store supports using multiple servers, so you can pass in an array of memcached instances if necessary.

# Logging
We use `bunyan` to generate rich logs in JSON format. We output these logs to `stdout` and do our best (through some monkey patching of the `console` object) to output everything else to `stderr`. So the *only* thing that should come through on `stdout` is the stream of log events, unless some component directly writes to `process.stdout` (which should be considered a bug).

Our default `make` task (or `npm run-script start`) starts the server pipes stdout through a formatter, so you should see human-readable logs in the console instead of a stream of JSON objects. You can do this manually by doing
`node app.js | ./node_modules/.bin/bunyan`.


## Log aggregation with Graylog2
If you want to aggregate logs with Graylog2 there is a minor amount of additional setup:

```bash
export GRAYLOG_HOST="graylog.example.org"    #defaults to localhost
export GRAYLOG_PORT=12201                    #defaults to 11201
export GRAYLOG_FACILITY="openbadger-whatevs" #defaults to openbadger
```

We've included a CLI tool, `bin/messina`, which takes a stream of JSON on stdin, converts it to [GELF](https://github.com/Graylog2/graylog2-docs/wiki/GELF) and sends it off to the configured Graylog2 server. It also pipes stdin to stdout, so you can chain commands: `node app.js | bin/messina | bunyan`. This is exactly what `npm run-script start-with-logs` does.

# Installing deps & starting the server

```bash
$ make     # will do `npm install` and then start server
```

# Running the test suite

The test suite assumes mongodb is running on localhost and using the
openbadger_test db.

You can use the following commands to run the entire suite:

```bash
$ bin/test.js          # normally you'd use this
$ bin/test.js --debug  # if you want to see debugging
$ make lint            # to lint the codebase
```

You can also run just a few of the tests:

```bash
$ bin/test.js tests/api.test.js  # run only one test file
$ bin/test.js -f bad             # run all test files w/ 'bad' in their name
```

This is useful for when one file (or area of code) is giving you trouble
and you don't want to run through the whole suite to debug just that one
thing.

# CloudFoundry configuration

```bash

$ vmc login

$ vmc push clopenbadger --runtime node08 --mem 128M --no-start
    Would you like to deploy from the current directory? [Yn]:
    Application Deployed URL [clopenbadger.vcap.mozillalabs.com]:
    Detected a Node.js Application, is this correct? [Yn]:
    Creating Application: OK
    Would you like to bind any services to 'clopenbadger'? [yN]:
    Uploading Application:
      Checking for available resources: OK
      Processing resources: OK
      Packing application: OK
      Uploading (93K): OK
    Push Status: OK

$ vmc create-service redis redis-clopenbadger
    Creating Service: OK

$ vmc create-service mongodb mongodb-clopenbadger
    Creating Service: OK

$ vmc bind-service redis-clopenbadger clopenbadger
    Binding Service [redis-clopenbadger]: OK

$ vmc bind-service mongodb-clopenbadger clopenbadger
    Binding Service [mongodb-clopenbadger]: OK

$ vmc env-add clopenbadger OPENBADGER_PROTOCOL=https
    Adding Environment Variable [OPENBADGER_PROTOCOL=https]: OK

$ vmc env-add clopenbadger OPENBADGER_SECRET="badgerbadgerbadgerbadger"
    Adding Environment Variable [OPENBADGER_SECRET=badgerbadgerbadgerbadger]: OK

$ vmc env-add clopenbadger OPENBADGER_ADMINS='[\"swex@mozilla.com\", \"*@mozillafoundation.org\"]'
    Adding Environment Variable [OPENBADGER_ADMINS=[\"swex@mozilla.com\", \"*@mozillafoundation.org\"]]: OK

$ vmc env-add clopenbadger OPENBADGER_PERSONA_AUDIENCE=https://clopenbadger.vcap.mozillalabs.com
    Adding Environment Variable [OPENBADGER_PERSONA_AUDIENCE=https://clopenbadger.vcap.mozillalabs.com]: OK

$ vmc env-add clopenbadger OPENBADGER_NOTIFICATION_WEBHOOK=http://localhost:3000/notify/claim
    Adding Environment Variable [OPENBADGER_NOTIFICATION_WEBHOOK=http://localhost:3000/notify/claim]: OK

And finally:

$ vmc restart clopenbadger
    Staging Application: OK
    Starting Application: OK
```

# Heroku configuration

You should only have to do the following once:

```bash
$ heroku login
    Enter your Heroku credentials.
    Email: brian@mozillafoundation.org
    Password:
    Could not find an existing public key.
    Would you like to generate one? [Yn]
    Generating new SSH public key.
    Uploading ssh public key /Users/brian/.ssh/id_rsa.pub

$ heroku create
    Creating evening-fjord-7837... done, stack is cedar
    http://evening-fjord-7837.herokuapp.com/ | git@heroku.com:evening-fjord-7837.git
    Git remote heroku added

$ git push heroku HEAD:master
    Counting objects: 23, done.
    Delta compression using up to 4 threads.
    Compressing objects: 100% (13/13), done.
    Writing objects: 100% (13/13), 1.26 KiB, done.
    Total 13 (delta 9), reused 0 (delta 0)

    -----> Heroku receiving push
    -----> Node.js app detected
    -----> Resolving engine versions
           Using Node.js version: 0.8.11
           Using npm version: 1.1.49
    -----> Fetching Node.js binaries
    -----> Vendoring node into slug
    -----> Installing dependencies with npm
           npm http GET https://registry.npmjs.org/express/3.0.0rc5
           npm http GET https://registry.npmjs.org/nunjucks
           ...
           ...
           Dependencies installed
    -----> Building runtime environment
    -----> Discovering process types
           Procfile declares types -> web
    -----> Compiled slug size: 11.2MB
    -----> Launching... done, v21
           http://evening-fjord-7837.herokuapp.com deployed to Heroku

    To git@heroku.com:evening-fjord-7837.git
       bcd2285..cce42fa  master -> master

$ heroku ps:scale web=1
    Scaling web processes... done, now running 1
```

Now, you must set the heroku environment configs. It's very similar to
setting local env configs, only you use `heroku config:add` instead of
`export`:

```bash
heroku config:add OPENBADGER_HOST="evening-fjord-7837.herokuapp.com"
heroku config:add OPENBADGER_PROTOCOL="http"
heroku config:add OPENBADGER_PORT=80
heroku config:add OPENBADGER_LOGDIR='.'
heroku config:add OPENBADGER_PERSONA_AUDIENCE="http://evening-fjord-7837.herokuapp.com"
heroku config:add OPENBADGER_SECRET="19ofOKiFSr8aCyRpH2ohmfh5O7dOpReCHa9vkeoWJCWP72oVb"
heroku config:add OPENBADGER_REDIS_HOST="your-redis-host.org"
heroku config:add OPENBADGER_REDIS_PORT=6379
heroku config:add OPENBADGER_MONGO_HOST="your-mongo-host.org"
heroku config:add OPENBADGER_MONGO_PORT=27017
heroku config:add OPENBADGER_MONGO_DB="openbadger"
heroku config:add OPENBADGER_ADMINS='["*@mozilla(foundation)?.org"]'
heroku config:add OPENBADGER_NOTIFICATION_WEBHOOK="http://localhost:3000/notify/"
```

# Deploying to Heroku

```bash
$ make heroku    # deploy if out of date & opens in your browser
```
