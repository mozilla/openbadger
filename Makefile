server: dependencies
	node_modules/.bin/up -t 0 -n 1 -w -p ${OPENBADGER_PORT} app.js | ./node_modules/.bin/bunyan

dependencies:
	@npm install

lint:
	@jshint *.js lib/*.js models/*.js routes/*.js

test:
	bin/test.js

verbose-test:
	bin/test.js --debug

heroku:
	@git push heroku master && heroku open

.PHONY: server test lint heroku dependencies verbose-test
