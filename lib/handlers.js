//  Request Handlers
const helpers = require('./helpers');
const users = require('./handlers/users');
const tokens = require('./handlers/tokens');
const checks = require('./handlers/checks');
const handlers = {};


handlers.users = (data, callback) => {
    const handlerOptions = {
        data,
        callback,
        methods: ['get', 'post', 'put', 'delete']
    };
    handlers.masterHandler('_users', handlerOptions);
};

handlers._users = users;


handlers.tokens = (data, callback) => {
    const handlerOptions = {
        data,
        callback,
        methods: ['get', 'post', 'put', 'delete']
    };
    handlers.masterHandler('_tokens', handlerOptions);
};

handlers._tokens = tokens;

handlers.checks = (data, callback) => {
    const handlerOptions = {
        data,
        callback,
        methods: ['get', 'post', 'put', 'delete']
    };
    handlers.masterHandler('_checks', handlerOptions);
}

handlers._checks = checks

handlers.masterHandler = (path, options) => {
    // options = {
    //     data: Object,
    //     callback: Function,
    //     methods: string[]
    // }
    let req = helpers.cleanFields(options.data, ['payload']);
        req = helpers.cleanFields(options.data, ['payload', 'queryStringObj']);

    const method = options.data.method.toLowerCase();
    if(options.methods.indexOf(method.toLowerCase()) > -1){
        handlers[path][method](req, options.callback);
    } else {
        options.callback(405);
    }
}

handlers.ping = (data, callback) => {
    callback(200, {'Success': 'Ping was successful'});
};

handlers.notFound = (data, callback) => {
    callback(404);
};

module.exports = handlers;