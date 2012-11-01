/**
 * Convert "1", "true", "True", "t", "T" to true, all others to false
 *
 */
function testForTruthiness(string){
  return /^1|t(rue)?/i.test(string);
}

// Here we hack the environment variables that habitat uses based on VCAP_SERVICES provided by CloudFoundry
if (!testForTruthiness(process.env.IGNORE_VCAP)){
  var vcapServices = JSON.parse(process.env.VCAP_SERVICES);

  for(var service in vcapServices){
    if (/^redis/.test(service)){
      var creds = vcapServices[service][0].credentials;
      process.env.OPENBADGER_REDIS_HOST = creds.host;
      process.env.OPENBADGER_REDIS_PORT = creds.port;
      process.env.OPENBADGER_REDIS_PASS = creds.password;
    }
    if (/^mongo/.test(service)){
      var creds = vcapServices[service][0].credentials;
      process.env.OPENBADGER_MONGO_HOST = creds.host;
      process.env.OPENBADGER_MONGO_PORT = creds.port;
      process.env.OPENBADGER_MONGO_USER = creds.username;
      process.env.OPENBADGER_MONGO_PASS = creds.password
      process.env.OPENBADGER_MONGO_DB = creds.db
    }
  }

  process.env.OPENBADGER_HOST = process.env.VCAP_APP_HOST;
  process.env.OPENBADGER_PORT = process.env.VCAP_APP_PORT;
}
