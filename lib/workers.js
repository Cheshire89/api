// WORKER RELATED TASKS
const validateChecksWorker = require('./workers/validateChecksWorker');
const rotateLogsWorker = require('./workers/rotateLogsWorker');
const workers = {};

// init script
workers.init = () => {
    validateChecksWorker.init();
    rotateLogsWorker.init();
};

module.exports = workers;