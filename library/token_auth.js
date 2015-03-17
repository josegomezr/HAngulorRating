var _ = require('lodash');
var fs = require('fs');
var regex_uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


function AuthHandler (config) {
    return function (request, reply) {
        var sessId = false;

        // 1st check
        if(_.has(request.state, 'sessionId')){
            sessId = _.trim(decodeURIComponent(request.state.sessionId), '"');
        }else{
            return reply.continue({ credentials: {} });
        }

        if(!regex_uuid.test(sessId)){
            return reply.continue({ credentials: {} });
        }

        fs.readFile( config.storagePath + sessId, function (err, data) {
            if(err){
                return reply.continue({ credentials: {} });    
            }

            var credentials = JSON.parse(data);
            
            // 2nd check
            if(credentials.userAgent != request.headers['user-agent']){
                return reply.continue({ credentials: {} });
            }

            // 3nd check
            if(credentials.host != request.info.host){
                return reply.continue({ credentials: {} });
            }

            return reply.continue({ credentials: credentials });
        });
    }
}



module.exports.register = function (server, pluginOptions, next) {
    var scheme = function (server, options) {
        return {
            authenticate: AuthHandler(pluginOptions)
        };
    };

    server.auth.scheme('token_auth', scheme);
    server.auth.strategy('token_auth', 'token_auth');
    return next();
};

module.exports.register.attributes = {
    name: 'token_auth',
    version: '1.0.0'
//    pkg: require('./package.json')
};