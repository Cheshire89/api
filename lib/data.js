//  Library for storing and editing data

const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};

// Base directory
lib.baseDir = path.join(__dirname, '/../.data');

// CRUD
lib.create = (dir, fileName, data, callback) => {
    const file = `${lib.baseDir}/${dir}/${fileName}.json`;
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

lib.read = (dir, fileName, callback) => {
    let locData = null;
    const file = `${lib.baseDir}/${dir}/${fileName}.json`;
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

lib.update = (dir, fileName, data, callback) => {
    const file = `${lib.baseDir}/${dir}/${fileName}.json`;
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

lib.delete = (dir, fileName, callback) => {
    const file = `${lib.baseDir}/${dir}/${fileName}.json`;
    fs.unlink(file, error => {
        !error ? callback(false) : callback('Error: Deleting the file ' + fileName + '.json');
    })
}

module.exports = lib;