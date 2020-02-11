// WORKER RELATED TASKS
const validateChecksWorker = require('./workers/validateChecksWorker');
const rotateLogsWorker = require('./workers/rotateLogsWorker');
const workers = {};

// init script
workers.init = () => {
    console.log('\x1b[33m%s\x1b[0m', 'Background workers started');
    validateChecksWorker.init();
    rotateLogsWorker.init();
};

module.exports = workers;