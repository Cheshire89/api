/*
    Create and export configuration variables

    Generating keys
    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out sert.pem
*/

const environments = {};

// Staging (default) environment
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging',
    hashingSecret: 'ThisIsHashingSecret',
    maxChecks: 5,
    twillio: {
        fromPhone: '+15733033690',
        accountSid: 'ACbd9bc8a5ade75d820798123f7691b27d',
        authToken: '2f996b19165da4a201bd18e829480cba'
    }
};

// Production environment
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production',
    hashingSecret: 'ThisIsAlsoAHashingSecret',
    maxChecks: 5,
    twillio: {
        fromPhone: '+15733033690',
        accountSid: 'ACbd9bc8a5ade75d820798123f7691b27d',
        authToken: '2f996b19165da4a201bd18e829480cba'
    }
};

// Get current environment
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check if environment exists. Default to staging
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;