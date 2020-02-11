// SERVER RELATED TASKS

// Dependencies
const http = require('http');
const https = require('https');

const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

const util = require('util');
const debug = util.debuglog('server');


const server = {};

// Instantiate a http httpServer
server.httpServer = http.createServer((req, res) => server.unifiedServer(req, res));

// Instantiate the HTTPS  server
server.httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => server.unifiedServer(req, res));

// All the server logic for both http and https
server.unifiedServer = (req, res) => {

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
        const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
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

            if(statusCode == 200){
                debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
            }else {
                debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
            }
        });
    });
};

server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
};

// init script
server.init = () => {
    // Start httpServer and have it listen to port 3000
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[36m%s\x1b[0m', `The server is running ${config.envName} environment on port ${config.httpPort}`);
    });

    // Start httpsServer and have it listen to port 3001
    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[35m%s\x1b[0m', `The server is running ${config.envName} environment on port ${config.httpsPort}`);
    });
};

module.exports = server;