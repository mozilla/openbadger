server: dependencies
	@up -t 0 -n 1 -w -p 3000 server.js

dependencies:
	@npm install

lint:
	@jshint *.js lib/*.js models/*.js routes/*.js

test:
	@tap test/*.test.js

verbose-test:
	@node test/*.test.js

heroku:
	@git push heroku master

.PHONY: server test lint heroku dependencies verbose-test