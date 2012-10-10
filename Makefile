server:
	@up -t 0 -n 1 -w -p 3000 server.js

lint:
	@jshint *.js lib/*.js

test:
	@tap test/*.test.js

verbose-test:
	@node test/*.test.js

heroku:
	@git push heroku master

.PHONY: server test lint