server:
	@up -t 0 -n 1 -w -p 3000 server.js

lint:
	@jshint *.js lib/*.js

test:
	@tap test/*.test.js

.PHONY: server test lint