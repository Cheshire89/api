// WORKER RELATED TASKS
const validateChecksWorker = require('./workers/validateChecksWorker');
const workers = {};


// init script
workers.init = () => {
    validateChecksWorker.init();
};

module.exports = workers;