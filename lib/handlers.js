//  Request Handlers

const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
const handlers = {};


handlers.users = (data, callback) => {
    const req = helpers.cleanFields(data, ['payload']);
    const method = data.method.toLowerCase();
    const acceptableMethods = ['get', 'post', 'put', 'delete'];

    if(acceptableMethods.indexOf(method.toLowerCase()) > -1){
        handlers._users[method](req, callback);
    } else {
        callback(405);
    }
};

// Container for users methods
handlers._users = {};

// Required field: phone
handlers._users.get = (data, callback) => {
    const qPhone = data.queryStringObj.phone.trim();
    const phone = (typeof qPhone == 'string' && qPhone.length == 10) ? qPhone: false;

    if(phone){
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        if(token) {
            handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                if(tokenIsValid) {
                    _data.read('users', phone, (error, data) => {
                        if(!error && data){
                            // remove hashed password
                            delete data.hashedPassword;
                            callback(200, data);
                        } else {
                            callback(404, {'Error': 'User not found'});
                        }
                    });
                } else {
                    callback(403, {'Error': 'Token is not valid'});
                }
            });
        } else {
            callback(403, {'Error': 'Token is missing'});
        }
    } else {
        callback(400, {'Error': 'Missing required fields [phone]'});
    }
}

// Required data: firstName, lastName, phone, password, tosAgreement
handlers._users.post = (data, callback) => {
    const req = data.payload;
    const firstName = typeof(req.firstName) === 'string' && req.firstName.length > 0 ? req.firstName : false;
    const lastName = typeof(req.lastName) === 'string' && req.lastName.length > 0 ? req.lastName : false;
    const phone = typeof(req.phone) === 'string' && req.phone.length === 10 ? req.phone : false;
    const password = typeof(req.password) === 'string' && req.password.length > 0? req.password : false;
    const tosAgreement = typeof(req.tosAgreement) === 'boolean' && req.tosAgreement == true;

    if(firstName && lastName && phone && password && tosAgreement){
        // check that user does not exist
        _data.read('users', phone, (err, data) => {
            if(err){
                // Hash password
                const hashedPassword = helpers.hash(password);
                const userObject = {
                    firstName,
                    lastName,
                    phone,
                    hashedPassword,
                    tosAgreement
                };
                if(hashedPassword){
                    _data.create('users', phone, userObject, (err) => {
                        !err ? callback(200, userObject) : callback(500, {'Error': 'Could not create the new user'});
                    });
                } else {
                    callback(500, {'Error': 'Could not hash the user\'s password'});
                }
            } else {
                callback(400, {'Error': `User with phone number [${phone}] already exists`});
            }
        })
    } else {
        // [${requiredFields.toString()}]
        callback(400, {'Error': `Missing required fields`});
    }
}

// Required field: phone
// Optional data firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
    const req = data.payload;
    const qPhone = req.phone;
    const phone = (typeof qPhone == 'string' && qPhone.length == 10) ? qPhone: false;
    if(phone){
        const firstName = typeof(req.firstName) === 'string' && req.firstName.length > 0 ? req.firstName : false;
        const lastName = typeof(req.lastName) === 'string' && req.lastName.length > 0 ? req.lastName : false;
        const password = typeof(req.password) === 'string' && req.password.length > 0? data.payload.password : false;

        if(firstName || lastName || password){
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
            if(token) {
                handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                    if(tokenIsValid) {
                        // look up user
                        _data.read('users', phone, (error, userData) => {
                            if(!error && userData){
                                if(firstName){
                                    userData.firstName = firstName;
                                }
                                if(lastName){
                                    userData.lastName = lastName;
                                }
                                if(password){
                                    const hashedPassword = helpers.hash(password);
                                    userData.hashedPassword = hashedPassword;
                                }

                                _data.update('users', phone, userData, err => {
                                    !err ? callback(200) : callback(500, {'Error': 'Could not update the user'});
                                });
                            } else {
                                callback(404, {'Error': 'User not found'});
                            }
                        });
                    } else {
                        callback(403, {'Error': 'Token is not valid'});
                    }
                });
            } else {
                callback(403, {'Error': 'Token is missing'});
            }

        } else {
            callback(400, {'Error': 'Missing fields to update'});
        }
    } else {
        callback(400, {'Error': 'Missing required fields [phone]'});
    }
}

// Required field: phone
handlers._users.delete = (data, callback) => {
    const qPhone = data.queryStringObj.phone.trim();
    const phone = (typeof qPhone == 'string' && qPhone.length == 10) ? qPhone: false;
    if(phone){
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        if(token) {
            handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                if(tokenIsValid) {
                    _data.read('users', phone, (err, userData) => {
                        if(!err && userData){
                            _data.delete('users', phone, err=>{
                                if(!err){
                                    // delete eache of the checks associated with the user
                                    const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ? userData.checks : [];
                                    let checksToDelete = userChecks.length;
                                    if(checksToDelete > 0){
                                        let checksDeleted = 0;
                                        let deletionErrors = false;

                                        userChecks.forEach(checkId => {
                                            _data.delete('checks', checkId, err => {
                                                if(err){
                                                    deletionErrors = true;
                                                }
                                                checksDeleted++;
                                                if(checksDeleted == checksToDelete){
                                                    if(!deletionErrors){
                                                        callback(200);
                                                    } else {
                                                        callback(500, {'Error': 'Error(s) encounterd while attempting to delete all of the user\'s checks'});
                                                    }
                                                }
                                            });
                                        });
                                    } else {
                                        callback(200);
                                    }
                                } else {
                                    callback(500, {'Error': 'Could not delete the specified user'})
                                }
                            })
                        } else {
                            callback(400, {'Error': 'User not found'});
                        }
                    });
                } else {
                    callback(403, {'Error': 'Token is not valid'});
                }
            });
        } else {
            callback(403, {'Error': 'Token is missing'});
        }
    } else {
        callback(400, {'Error': 'Missing required fields [phone]'});
    }
}


handlers.tokens = (data, callback) => {
    const req = helpers.cleanFields(data, ['payload']);
    const method = data.method.toLowerCase();
    const acceptableMethods = ['get', 'post', 'put', 'delete'];
    if(acceptableMethods.indexOf(method.toLowerCase()) > -1){
        handlers._tokens[method](req, callback);
    } else {
        callback(405);
    }
};

handlers._tokens = {};

// Required data: id
// Optional data: none;
handlers._tokens.get =(data, callback) => {
    // Check that id is valid
    const qId = data.queryStringObj.id.trim();
    const id = (typeof qId == 'string' && qId.length === 20) ? qId: false;
    if(id){
        _data.read('tokens', id, (err, tokenData) => {
            !err && tokenData ? callback(200, tokenData) :  callback(400, {'Error': 'Token is not valid'});
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

// Required data: phone, password
// Optional data: none
handlers._tokens.post =(data, callback) => {
    const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0? data.payload.password.trim() : false;
    if(phone && password){
        _data.read('users', phone, (error, userData) => {
            if(!error && userData){
                const hashedPassword = helpers.hash(password);
                if(hashedPassword === userData.hashedPassword) {
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        phone,
                        expires,
                        id: tokenId,
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, err => {
                        !err ? callback(200, tokenObject) :  callback(500, {'Error': 'Could not create new token'});
                    });
                } else {
                    callback(400, {'Error': 'Invalid password'});
                }
            } else {
                callback(400, {'Error': 'User not found'});
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Required data: id, extend
// Optional data: none
handlers._tokens.put =(data, callback) => {
    data.payload.id = data.payload.id.trim();
    const id = typeof(data.payload.id) === 'string' && data.payload.id.length === 20 ? data.payload.id : false;
    const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true;

    if(id && extend){
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData) {
                if(tokenData.expires > Date.now()){
                    // Set exparation an hour form now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    _data.update('tokens', id, tokenData, (err) => {
                        !err ? callback(200) : callback(500, {'Error': 'Could not update the token\'s exparation'});
                    });
                } else {
                    callback(400, {'Error': 'The token has alredy expired and cannot be extended'});
                }
            } else {
                callback(400, {'Error': 'Token is not valid'});
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field(s) or field(s) are invalid'})
    }
};

// Required data: id
// Optional data: none
handlers._tokens.delete =(data, callback) => {
    const qId = data.queryStringObj.id.trim();
    const id = (typeof qId == 'string' && qId.length == 20) ? qId: false;
    if(id){
        _data.read('tokens', id, (err, data) => {
            if(!err && data){
                _data.delete('tokens', id, err => {
                    !err ? callback(200) : callback(500, {'Error': 'Could not delete the specified token'});
                })
            } else {
                callback(400, {'Error': 'Token not found'});
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field(s) or field(s) are invalid'});
    }
};

// verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
    // Look up the token
    _data.read('tokens', id, (err, tokenData) => {
        if(!err && tokenData) {
            // return true or false;
            callback(tokenData.phone === phone && tokenData.expires > Date.now());
        } else {
            callback(false);
        }
    });
};

handlers.checks = (data, callback) => {
    const req = helpers.cleanFields(data, ['payload', 'queryStringObj']);
    const method = data.method.toLowerCase();
    const acceptableMethods = ['get', 'post', 'put', 'delete'];
    if(acceptableMethods.indexOf(method.toLowerCase()) > -1){
        handlers._checks[method](req, callback);
    } else {
        callback(405);
    }
}

handlers._checks = {};

// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
    const qId = data.queryStringObj.id.trim();
    const id = (typeof qId == 'string' && qId.length == 20) ? qId: false;

    if(id){
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData){
                const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                if(token) {
                    handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
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
handlers._checks.post = (data, callback) => {
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
handlers._checks.put = (data, callback) => {
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
handlers._checks.delete = (data, callback) => {
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

handlers.ping = (data, callback) => {
    callback(200, {'Success': 'Ping was successful'});
};

handlers.notFound = (data, callback) => {
    callback(404);
};

module.exports = handlers;