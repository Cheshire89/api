/*
    Primary file for the API
*/

// Dependencies
const http = require('http');
const https = require('https');

const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// @TODO get rid of this

helpers.sendTwillioSms('7209887454', 'My Twillio Test message', (err) => {
    console.log('this was the twillo error', err);
})

// Instantiate a http httpServer
const httpServer = http.createServer((req, res) => unifiedServer(req, res));

// Start httpServer and have it listen to port 3000
httpServer.listen(config.httpPort, () => {
    console.log(`The server is running ${config.envName} environment on port ${config.httpPort}`);
});

const httpsServerOptions = {
    key: fs.readFileSync('./https/key.pem'),
    cert: fs.readFileSync('./https/cert.pem')
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => unifiedServer(req, res));

// Start httpsServer and have it listen to port 3001
httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is running ${config.envName} environment on port ${config.httpsPort}`);
});

// All the server logic for both http and https
const unifiedServer = (req, res) => {

    // Get url and parse it
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    // Get the path
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query as an object
    const queryStringObj = parsedUrl.query;

    // Get the http method
    const method = req.method.toUpperCase();

    // Get headers
    const headers = req.headers;

    // Get payload if there is any
    const decorder = new StringDecoder('utf-8');
    let payload = '';

    req.on('data', data => {
        payload += decorder.write(data);
    });

    req.on('end', () => {
        payload += decorder.end();

        //  Choose a handler this request should go to
        //   If one is not found use not found handler
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;
        const data = {
            method,
            trimmedPath,
            queryStringObj,
            headers,
            payload: helpers.parseJsonToObject(payload)
        };

        // Route the request to chosen handler
        chosenHandler(data, (statusCode, payload) => {
            statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
            payload = typeof(payload) === 'object' ? payload : {};
            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
        });
    });
};

const router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
};
