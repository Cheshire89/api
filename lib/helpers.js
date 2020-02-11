// Helpers for various taskts
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');
const _logs = require('./logs');

class Helpers {
    constructor(){}
    hash = (password) => {
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

    parseJsonToObject = (jsonString) => {
        try{
           return JSON.parse(jsonString)
        }catch(e){
            return {};
        }
    };

    createRandomString = (length) => {
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

    // Trims strings of selected object
    cleanFields = (obj, fieldsArr) => {
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
    sendTwillioSms = (phone, msg, callback) => {
        // Validate params
        phone = typeof(phone) === 'string' && phone.trim().length == 10 ? phone.trim() : false;
        msg = typeof(msg) === 'string' && msg.trim().length > 0  && msg.trim().length < 1600 ? msg.trim() : false;

        if(phone && msg){
            // Configure the request
            const payload = {
                'From': config.twilio.fromPhone,
                'To':  '+1' + phone,
                'Body': msg
            };

            const stringPayload = querystring.stringify(payload);

            // Configure request details
            const requestDetails = {
                protocol: 'https:',
                hostname: 'api.twilio.com',
                method: 'POST',
                path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
                auth: config.twilio.accountSid + ':' + config.twilio.authToken,
                headers: {
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
                    callback('Status code returned was ' + status + ': ' + res.statusMessage);
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
    };

    // Parses an object to check if fields are valid
    objectValidator = (obj) => {
        let dataIsValid = true;
        const invalidFields = [];
        Object.keys(obj).forEach(key => {
            if(key !== 'state') {
                if(!obj[key]){
                    invalidFields.push(key);
                    dataIsValid = false;
                }
            }
        });
        return {
            valid: dataIsValid,
            fields: invalidFields
        };
    };

    // Creates a copy of an object with selected fields
    pluck = (obj, keyArray) => {
        const returnObj = {};
        Object.keys(obj).forEach(key => {
            if(keyArray.indexOf(key) !== -1){
                returnObj[key] = obj[key];
            }
        });
        return returnObj;
    };

    log = (fileName, obj) => {
        if(!typeof obj === 'object'){
            console.error('helpers.log accepts objects only');
            return;
        }

        const logString = JSON.stringify(obj);

        _logs.append(fileName, logString, (err) => {
            if(!err){
                console.log('logging to file succeeded');
            } else {
                console.log('logging to file failed');
            }
        });
    };
}


module.exports = new Helpers();