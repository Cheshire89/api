const _data = require('../data');
const helpers = require('../helpers');

const tokens = {};

// Required data: id
// Optional data: none;
tokens.get =(data, callback) => {
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
tokens.post =(data, callback) => {
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
tokens.put =(data, callback) => {
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
tokens.delete =(data, callback) => {
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
tokens.verifyToken = (id, phone, callback) => {
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

module.exports = tokens;