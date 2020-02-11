const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class Log {
    baseDir = path.join(__dirname, '/../.logs/');

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

    // List all the logs, and optionally include the compressed logs
    list(includeCompressedLogs, callback){
        fs.readdir(this.baseDir, (err, data) => {
            if(!err && data && data.length){
                const trimmedFileNames = [];
                data.forEach(fileName => {
                    // Add .log files
                    if(fileName.indexOf('.log') > -1){
                        trimmedFileNames.push(fileName.replace('.log', ''));
                    }

                    // Add .gz files
                    if(includeCompressedLogs && fileName.indexOf('.gz.b64') > -1){
                        trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                    }
                });

                callback(false, trimmedFileNames);
            } else {
                callback(err, data);
            }
        });
    }

    // Compress the contents of one .log files into a .gz.b64 file within the same directory
    compress(logId, newFileId, callback){
        const sourceFile = logId + '.log';
        const destinationFile = newFileId + '.gz.b64';

        // Read the source file
        fs.readFile(this.baseDir + sourceFile, 'utf8', (err, inputStr) => {
            if(!err && inputStr){
                // Compress the data uzing gzip
                zlib.gzip(inputStr, (err, buffer) => {
                    if(!err && buffer){
                        // Send the data to the destination file
                        fs.open(this.baseDir + destinationFile, 'wx', (err, fileDescriptor) => {
                            if(!err && fileDescriptor){
                                fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                                    if(!err){
                                        fs.close(fileDescriptor, err => {
                                           err ? callback(false) : callback(err);
                                        });
                                    } else {
                                        callback(err);
                                    }
                                })
                            } else {
                                callback(err, fileDescriptor);
                            }
                        })
                    } else {
                        callback(err);
                    }
                })
            } else {
                callback(err);
            }
        })
    }

    // Decompress the contents of .gz.b64 file into a string variable
    decompress(fileId, callback){
        const fileName = fileId + '.gz.b64';
        fs.readFile(this.baseDir + fileName, 'utf8', (err, str) => {
            if(!err && str){
                const inputBuffer = Buffer.from(str, 'base64');
                zlib.unzip(inputBuffer, (err, outputBuffer) => {
                    if(!err && outputBuffer){
                        const unzipStr = outputBuffer.toString();
                        callback(false, unzipStr);
                    } else {
                        callback(err);
                    }
                })
            } else {
                callback(err);
            }
        })
    }

    truncate(logId, callback){
        const fileName = logId + '.log';
        fs.truncate(this.baseDir + fileName, 0, err => {
            !err ? callback(false) : callback(err);
        })
    }
}

module.exports = new Log();