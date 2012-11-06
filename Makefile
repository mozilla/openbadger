server: dependencies
	node_modules/.bin/up -t 0 -n 1 -w -p ${OPENBADGER_PORT} app.js

dependencies:
	@npm install

lint:
	@jshint *.js lib/*.js models/*.js routes/*.js

test:
	@node tests && node_modules/.bin/tap tests/*.test.js

verbose-test:
	@node tests/*.test.js

heroku:
	@git push heroku master && heroku open

.PHONY: server test lint heroku dependencies verbose-test