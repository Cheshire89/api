const tokens = require('./tokens');
const helpers = require('../helpers');
const _data = require('../data');

const users = {};

// Required field: phone
users.get = (data, callback) => {
    const qPhone = data.queryStringObj.phone.trim();
    const phone = (typeof qPhone == 'string' && qPhone.length == 10) ? qPhone: false;

    if(phone){
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        if(token) {
            tokens.verifyToken(token, phone, tokenIsValid => {
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
users.post = (data, callback) => {
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
users.put = (data, callback) => {
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
                tokens.verifyToken(token, phone, tokenIsValid => {
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
users.delete = (data, callback) => {
    const qPhone = data.queryStringObj.phone.trim();
    const phone = (typeof qPhone == 'string' && qPhone.length == 10) ? qPhone: false;
    if(phone){
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        if(token) {
            tokens.verifyToken(token, phone, tokenIsValid => {
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

module.exports = users;