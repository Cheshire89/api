const _logs = require('../logs');

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
                                    console.log(`Success: truncating [${logId}.log]`)
                                } else {
                                    console.log(`Error: truncating [${logId}.log]`, err)
                                }
                            })
                        } else {
                            console.log(`Error: compressing [${logId}.log]`, err);
                        }
                    })
                })
            } else {
                console.log("Error: could not find any logs to rotate");
            }
        })
    };

    loop(){
        setInterval(() => this.rotateLogs(), this.timer)
    };
}

module.exports = new RotateLogsWorker();