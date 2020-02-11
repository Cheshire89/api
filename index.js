/*
    Primary file for the API
*/
const server = require('./lib/server');
const workers = require('./lib/workers');

// declare app
const app = {};

app.init = () => {
    // Start server
    server.init();

    // Start workers
    workers.init();
};

app.init();

module.exports = app;