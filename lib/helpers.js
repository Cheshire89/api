// Helpers for various taskts
const crypto = require('crypto');
const config = require('./config');
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

module.exports = helpers;