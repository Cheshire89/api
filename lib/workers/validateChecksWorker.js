const https = require('https');
const http = require('http');
const url = require('url');

const _data = require('../data');
const _logs = require('../logs');
const helpers = require('../helpers');

class ValidateChecksWorker{
    timer = 60;

    constructor(){}

    init() {
        this.gatherAllChecks();
        this.loop();
    };

    gatherAllChecks() {
        _logs.list(false, (err, checks) => {
            if(!err && checks && checks.length > 0) {
                checks.forEach(check => {
                    // read in the check data
                    _data.read('checks', check, (err, checkData) => {
                        if(!err && checkData) {
                            // pass data to check validator
                            this.validateCheckData(checkData);
                        } else {
                            console.log(`${check} :error`, err);
                        }
                    })
                });
            } else {
                if(checks && checks.length === 0){
                    console.log('Could not find any checks to process');
                } else {
                    console.log('gatherAllChecks: Error \n', err);
                }
            }
        })
    };

    validateCheckData(checkData) {
        checkData = typeof checkData === 'object' && checkData !== null ? checkData : {};
        checkData.id = typeof checkData.id === 'string' && checkData.id.length === 20 ? checkData.id : false;
        checkData.userPhone = typeof checkData.userPhone === 'string' && checkData.userPhone.length === 10 ? checkData.userPhone : false;
        checkData.protocol = typeof checkData.protocol === 'string' && ['http', 'https'].indexOf(checkData.protocol) > -1 ? checkData.protocol : false;
        checkData.url = typeof checkData.url === 'string' && checkData.url.length > 0 ? checkData.url : false;
        checkData.method = typeof checkData.method === 'string' && ['get', 'post', 'put', 'delete'].indexOf(checkData.method) > -1 ? checkData.method : false;
        checkData.successCodes = typeof checkData.successCodes === 'object' && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : false;
        checkData.timeoutSeconds = typeof checkData.timeoutSeconds === 'number' && checkData.timeoutSeconds % 1 === 0  && checkData.timeoutSeconds >= 1 && checkData.timeoutSeconds <= 5 ? checkData.timeoutSeconds : false;

        // Set the keys that may not be set
        checkData.state = typeof checkData.state === 'string' && ['up', 'down'].indexOf(checkData.state) > -1 ? checkData.state : 'down';
        checkData.lastChecked = typeof checkData.lastChecked === 'number' && checkData.lastChecked > 0 ? checkData.lastChecked : false;

        const validateObj = helpers.pluck(checkData, ['id', 'userPhone', 'protocol', 'url', 'method', 'successCodes', 'timeoutSeconds']);
        const validator = helpers.objectValidator(validateObj);
        if(validator.valid){
            this.performCheck(checkData);
        } else {
            console.log(`Error: ${checkData.id} fields are not properly formated [${validator.fields.toString()}]`)
        }
    };

    // Perform the check
    performCheck(checkData) {
        // Prepare the initial check outcome
        const checkOutcome = {
            error: false,
            responseCode: false
        };

        // Mark that the outcome has not been sent yet
        let outcomeSent = false;

        const parsedUrl = url.parse(`${checkData.protocol}://${checkData.url}`, true);
        const hostname = parsedUrl.hostname;
        const path = parsedUrl.path;

        const requestDetails = {
            hostname,
            path,
            protocol: checkData.protocol + ':',
            method: checkData.method.toUpperCase(),
            timeout: checkData.timeoutSeconds * 1000
        };

        const _moduleToUse = checkData.protocol == 'http' ? http : https;

        const req = _moduleToUse.request(requestDetails, res => {
            // Grab the status of sent request
            const status = res.statusCode;
            checkOutcome.responseCode = status;
            if(!outcomeSent){
                this.processCheckOutcome(checkData, checkOutcome);
                outcomeSent = true;
            }
        });

        // bind to error event

        req.on('error', err => {
            checkOutcome.error = {
                error: true,
                value: err
            };
            console.log('error', err);

            if(!outcomeSent){
                this.processCheckOutcome(checkData, checkOutcome);
                outcomeSent = true;
            }
        });

        req.on('timeout', err => {
            checkOutcome.error = {
                error: true,
                value: 'timeout'
            };

            if(!outcomeSent){
                this.processCheckOutcome(checkData, checkOutcome);
                outcomeSent = true;
            }
        });

        req.end();
    };


    processCheckOutcome(checkData, checkOutcome) {
        // check if the check is considered up or down
        const state = !checkOutcome.error && checkOutcome.responseCode && checkData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

        // deside if an alert is waranted
        const alertWaranted = checkData.lastChecked && checkData.state !== state;

        const timeOfCheck = Date.now();

        helpers.log(
            checkData.id,
            {
                'check': checkData,
                'outcome': checkOutcome,
                'state': state,
                'alert': alertWaranted,
                'time': new Date(timeOfCheck).toUTCString()
            }
        );

        // update checkdata
        const newCheckData = checkData;
        newCheckData.state = state;
        newCheckData.lastChecked = timeOfCheck;


        // Save
        _data.update('checks', newCheckData.id, newCheckData, err => {
            if(!err){
                if(alertWaranted){
                    this.alertUserToStatusChange(checkData);
                } else {
                    console.log(`${newCheckData.id}: Check outcome has not changed, no alert needed`);
                }
            } else {
                console.log(`Error: [${newCheckData.id}] check failed to update`);
            }
        })
    };

    // alert the user as to a change in their check data
    alertUserToStatusChange(checkData) {
        const message = 'Alert: Your check for ' + checkData.method.toUpperCase() + checkData.protocol + '://' + checkData.url + ' is currently ' + checkData.state;
        helpers.sendTwillioSms(checkData.userPhone, message, (err, callback) => {
            if(!err){
                console.log('User was allrted to a status change in their check via sms!', message);
            } else {
                console.log(`Error: Could not send sms alert to [${checkData.userPhone}]`);
            }
        })
    };

    loop() {
        setInterval(() => this.gatherAllChecks(), 1000 * this.timer)
    };
}

module.exports = new ValidateChecksWorker();