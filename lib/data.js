//  Library for storing and editing data

const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

class Data {
    baseDir = path.join(__dirname, '/../.data');
    constructor(){}

    // CRUD
    create(dir, fileName, data, callback) {
        const file = `${this.baseDir}/${dir}/${fileName}.json`;
        // Open file for writing
        fs.open(file, 'wx', (err, fileDescriptor) => {
            if(!err && fileDescriptor) {
                // Convert data to a string
                const stringData = JSON.stringify(data);

                // Write to file and close it
                fs.writeFile(fileDescriptor, stringData, error => {
                    if(!error){
                        fs.close(fileDescriptor, error => {
                            !error ? callback(false) : callback('Error: Closing new file');
                        })
                    } else {
                        callback('Error: Writing to new file');
                    }
                });
            } else {
                callback('Error: Could not create new file. It may already exist');
            }
        })
    };

    read(dir, fileName, callback) {
        let locData = null;
        const file = `${this.baseDir}/${dir}/${fileName}.json`;
        fs.readFile(file, 'utf-8', (error, data) => {
            if(!error && data) {
                const parsedData = helpers.parseJsonToObject(data);
                locData = parsedData;
                callback(false, parsedData);
            } else {
                locData = false;
                callback(error, data)
            }
        });
        return locData;
    };

    update(dir, fileName, data, callback) {
        const file = `${this.baseDir}/${dir}/${fileName}.json`;
        fs.open(file, 'r+', (err, fileDescriptor) => {
            if(!err && fileDescriptor) {
                // Convert data to a string
                const stringData = JSON.stringify(data);

                fs.ftruncate(fileDescriptor, error => {
                    if(!error) {
                        // Write to file and close it
                        fs.writeFile(fileDescriptor, stringData, error => {
                            if(!error){
                                fs.close(fileDescriptor, error => {
                                    !error ? callback(false) : callback('Error: Closing new file');
                                })
                            } else {
                                callback('Error: Writing to existing file file');
                            }
                        });
                    } else {
                        callback('Error: truncating file');
                    }
                });
            } else {
                callback('Error: Could not open file. It may not exist');
            }
        })
    };

    delete(dir, fileName, callback) {
        const file = `${this.baseDir}/${dir}/${fileName}.json`;
        fs.unlink(file, error => {
            !error ? callback(false) : callback('Error: Deleting the file ' + fileName + '.json');
        })
    }

    // list all the items in a directory
    list(dir, callback) {
        console.log('list ', this.baseDir);
        fs.readdir(`${this.baseDir}/${dir}/`, (err, data) => {
            if(!err && data && data.length > 0){
                const trimmedFileNames = [];
                data.forEach(fileName => trimmedFileNames.push(fileName.replace('.json', '')));
                callback(false, trimmedFileNames);
            } else {
                callback(err, data)
            }
        })
    }
}

module.exports = new Data();