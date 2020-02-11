const _logs = require('../logs');
const util = require('util');
const debug = util.debuglog('RotateLogsWorker');

class RotateLogsWorker{
    // 24 hours
    timer = 1000 * 60 * 60 * 24;

    constructor(){}

    init(){
        this.rotateLogs();
        this.loop();
    };

    rotateLogs(){
        _logs.list(false, (err, logsArr) => {
            if(!err && logsArr && logsArr.length){
                logsArr.forEach(logName => {
                    // Compress the data to a different file.
                    const logId = logName.replace('.log', '');
                    const newFileId = logId + '-' + Date.now();
                    _logs.compress(logId, newFileId, (err) => {
                        if(!err){
                            // Trunkate the log.
                            _logs.truncate(logId, err => {
                                if(!err){
                                    debug(`Success: truncating [${logId}.log]`)
                                } else {
                                    debug(`Error: truncating [${logId}.log]`, err)
                                }
                            })
                        } else {
                            debug(`Error: compressing [${logId}.log]`, err);
                        }
                    })
                })
            } else {
                debug("Error: could not find any logs to rotate");
            }
        })
    };

    loop(){
        setInterval(() => this.rotateLogs(), this.timer)
    };
}

module.exports = new RotateLogsWorker();