const _data = require('../data');
const helpers = require('../helpers');
const config = require('../config');
const tokens = require('./tokens');

const checks = {};

// Required data: id
// Optional data: none
checks.get = (data, callback) => {
    const qId = data.queryStringObj.id.trim();
    const id = (typeof qId == 'string' && qId.length == 20) ? qId: false;

    if(id){
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData){
                const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                if(token) {
                    tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                        if(tokenIsValid) {
                            callback(200, checkData);
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(403, {'Error': 'Token is missing'});
                }
            } else {
                callback(404);
            }
        })

    } else {
        callback(400, {'Error': 'Missing required fields [id]'});
    }
};

// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
checks.post = (data, callback) => {
    const req = data.payload;
    const protocol = typeof(req.protocol) === 'string' && ['http', 'https'].indexOf(req.protocol) > -1 ? req.protocol : false;
    const url = typeof(req.url) === 'string' && req.url.length > 0 ? req.url : false;
    const method = typeof(req.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(req.method) > -1 ? req.method : false;
    const successCodes = typeof(req.successCodes) === 'object' && req.successCodes instanceof Array && req.successCodes.length > 0 ? req.successCodes : false;
    const timeoutSeconds = typeof(req.timeoutSeconds) === 'number' && req.timeoutSeconds % 1 === 0 && req.timeoutSeconds >= 1 && req.timeoutSeconds <= 5 ? req.timeoutSeconds : false;


    if (protocol && url && method && successCodes && timeoutSeconds) {
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        _data.read('tokens', token, (err, tokenData) => {
            if(!err && tokenData){
                const userPhone = tokenData.phone;

                _data.read('users', userPhone, (err, userData) => {
                    if(!err && userData){
                        const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : [];
                        if(userChecks.length < config.maxChecks){
                            const checkId = helpers.createRandomString(20);
                            const checkObject = {
                                id: checkId,
                                userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeoutSeconds
                            };

                            _data.create('checks', checkId, checkObject, (err) => {
                                if(!err){
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);
                                    _data.update('users', userPhone, userData, err => {
                                        if(!err){
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, {'Error': 'Could not update user with the new check'});
                                        }
                                    })
                                } else {
                                    callback(500, {'Error': 'Could not create a new check'});
                                }
                            })
                        } else {
                            callback(400, {'Error': `The user already has maximum number of checks [${config.maxChecks}]`});
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });
    } else {
        callback(400, {'Error': 'Missing required fields or fields are invalid'});
    }
};

// Rquired data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds
checks.put = (data, callback) => {
    // required
    const qId = data.queryStringObj.id.trim();
    const id = (typeof qId == 'string' && qId.length == 20) ? qId: false;

    // optional
    const req = data.payload;
    const protocol = typeof(req.protocol) === 'string' && ['http', 'https'].indexOf(req.protocol) > -1 ? req.protocol : false;
    const url = typeof(req.url) === 'string' && req.url.length > 0 ? req.url : false;
    const method = typeof(req.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(req.method) > -1 ? req.method : false;
    const successCodes = typeof(req.successCodes) === 'object' && req.successCodes instanceof Array && req.successCodes.length > 0 ? req.successCodes : false;
    const timeoutSeconds = typeof(req.timeoutSeconds) === 'number' && req.timeoutSeconds % 1 === 0 && req.timeoutSeconds >= 1 && req.timeoutSeconds <= 5 ? req.timeoutSeconds : false;

    if(id){
        if (protocol || url || method || successCodes || timeoutSeconds) {
            _data.read('checks', id, (err, checkData) => {
                if(!err && checkData){
                    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                    if(token) {
                        handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                            if(tokenIsValid) {
                                // Update checkData
                                if(protocol){
                                    checkData.protocol = protocol;
                                }
                                if(url){
                                    checkData.url = url;
                                }
                                if(method){
                                    checkData.method = method;
                                }
                                if(successCodes){
                                    checkData.successCodes = successCodes;
                                }
                                if(timeoutSeconds){
                                    checkData.timeoutSeconds = timeoutSeconds;
                                }

                                // store updates
                                _data.update('checks', id, checkData, err=>{
                                    !err ? callback(200) : callback(500, {'Error': 'Could not update the check'})
                                });
                            } else {
                                callback(403);
                            }
                        });
                    } else {
                        callback(403);
                    }
                } else {
                    callback(400, {'Error': "Check [id] does not exist"});
                }
            });
        } else {
            callback(400, {'Error': 'Missing fields to update'})
        }
    } else {
        callback(400, {'Error': 'Missing required fields [id]'});
    }
};

// Required data: id
// Optional data: none
checks.delete = (data, callback) => {
    const qId = data.queryStringObj.id;
    const id = (typeof qId == 'string' && qId.length == 20) ? qId: false;
    if(id){
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData){
                const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                if(token) {
                    handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                        if(tokenIsValid) {
                            _data.delete('checks', id, err => {
                                if(!err) {
                                    _data.read('users', checkData.userPhone, (err, userData) => {
                                        if(!err, userData){
                                            const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : [];
                                            // remove the deleted check from user checks
                                            const checkIndex = userChecks.indexOf(id);
                                            if(checkIndex > -1){
                                                userChecks.splice(checkIndex, 1);
                                                _data.update('users', checkData.userPhone, userData, err => {
                                                    !err ? callback(200) : callback(500, {'Error': 'Could not update user'});
                                                })
                                            } else {
                                                callback(500, {'Error': 'Could not find the check on user\'s object'});
                                            }
                                        } else {
                                            callback(500, {'Error': 'Could not find user who created the check'});
                                        }
                                    })
                                } else {
                                    callback(500, {'Error' : 'Could not delete the check data'});
                                }
                            });
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(403, {'Error': 'Missing required fields [id]'});
                }
            } else {
                callback(400, {'Error': 'The specified check [id] does not exist'});
            }
        })

    } else {
        callback(400, {'Error': 'Missing required fields [id]'});
    }
};

module.exports = checks;