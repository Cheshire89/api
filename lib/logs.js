const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class Log {
    static baseDir = path.join(__dirname, '/../.logs/');

    constructor(){}

    // append a string to a file. Create a file if it does not exist.
    append(filename, jsonString, callback) {
        jsonString += '\n';
        const logFileName = this.baseDir + filename + '.log';

        fs.open(logFileName, 'a' , (err, fileDescriptor) => {
            if(!err && fileDescriptor) {
                fs.appendFile(fileDescriptor, jsonString, err => {
                    if(!err){
                        fs.close(fileDescriptor, err => {
                            if(!err){
                                callback(false);
                            } else {
                                callback('Error: closing file that was being appended');
                            }
                        })
                    }else {
                        callback('Error: appending to file');
                    }
                })
            } else {
                callback('Error: Could not open file for appending');
            }
        })
    }
}

module.exports = new Log();