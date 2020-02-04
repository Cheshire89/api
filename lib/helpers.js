// Helpers for various taskts
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');
const helpers = {};
// Create SHA256 hash
helpers.hash = (password) => {
    if(typeof password == 'string' && password.length > 0){
        const hash = crypto
            .createHmac('sha256', config.hashingSecret)
            .update(password)
            .digest('hex');

        return hash;
    } else {
        return false;
    }
};

helpers.parseJsonToObject = (jsonString) => {
    try{
       return JSON.parse(jsonString)
    }catch(e){
        return {};
    }
};

helpers.createRandomString = (length) => {
    length = typeof(length) == 'number' && length > 0 ? length : false;
    if(length){
        let str = '';
        const possibleCharacters = "acdefghijklmnopqrstuvwxyz1234567890";
        for(i = 0; i < length; i++){
            // get random char from possibleCharacters
            let randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            str += randomChar;
        }
        return str;
    }else {
        return false;
    }
};

helpers.cleanFields = (obj, fieldsArr) => {
    for(let key in fieldsArr){
        const field = fieldsArr[key];
        for (let key in obj[field]){
            if(typeof obj[field][key] === 'string'){
                obj[field][key] = obj[field][key].trim();
            }
        }
    }
    return obj;
};

// Send SMS via Twillio
helpers.sendTwillioSms = (phone, msg, callback) => {
    // Validate params
    phone = typeof(phone) === 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) === 'string' && msg.trim().length > 0  && msg.trim().length < 1600 ? msg.trim() : false;

    if(phone && msg){
        // Configure the request
        const payload = {
            'from': config.twillio.fromPhone,
            'to':  '+1' + phone,
            'body': msg
        };

        const stringPayload = querystring.stringify(payload);

        // Configure request details
        const requestDetails = {
            'protocol': 'https:',
            'api': 'api.twillio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/' + config.twillio.accountSid + '/Messages.json',
            'auth': config.twillio.accountSid + ':' + config.twillio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate request obj
        const req = https.request(requestDetails, res => {
            // grab status
            const status = res.statusCode;
            if(status == 200 || status == 201){
                callback(false);
            } else {
                callback('Status code returned was ' + status);
            }
        });

        // Sent the request
        req.on('error', e => callback(e));

        // Add payload
        req.write(stringPayload);

        req.end();
    } else {
        callback('Given parameters were missing or invalid');
    }
}

module.exports = helpers;