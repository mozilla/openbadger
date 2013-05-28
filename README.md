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
export OPENBADGER_HOST="localhost"
export OPENBADGER_PROTOCOL="http"
export OPENBADGER_PORT=3000
export OPENBADGER_PERSONA_AUDIENCE="http://localhost:3000"
export OPENBADGER_LOGDIR='.'
export OPENBADGER_SECRET="badgerbadgerbadgerbadger"
export OPENBADGER_JWT_SECRET="badgerjwtsecret"
export OPENBADGER_REDIS_HOST="localhost"
export OPENBADGER_REDIS_PORT=6379
export OPENBADGER_MONGO_HOST="localhost"
export OPENBADGER_MONGO_PORT=27017
export OPENBADGER_MONGO_DB="openbadger"
export OPENBADGER_ADMINS='["*@mozilla(foundation)?.org"]'
```

You can either paste that directly into your terminal, or you can put
that in a file and `source` it. For example, if you save a version of
this at `config.env`, do:

```bash
$ source config.env
```

## Using memcached instead of redis for sessions
In some cases (such as deploying on AWS) it might be easier to use memcached rather than redis.

```bash
export OPENBADGER_MEMCACHED_HOSTS="127.0.0.1:11211"
```

Note the use of `HOSTS` in the plural – the memcached session store supports using multiple servers, so you can pass in an array of memcached instances if necessary.

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

You can also run the tests one-off by doing
`bin/test.js tests/<name-of-file>.js`. This is useful for when one file is
giving you trouble and you don't want to run through the whole suite
to debug just that one thing.

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
```

# Deploying to Heroku

```bash
$ make heroku    # deploy if out of date & opens in your browser
```
