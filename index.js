var Hapi = require('hapi', true);
var server = new Hapi.Server();
var controllers = require('./controllers', true);
var fs = require('fs');
    
server.connection({ 
    port: 8000,
    // port: 8443,
    // tls: {
    //     key: fs.readFileSync("certificates/keys/server.key"),
    //     cert: fs.readFileSync("certificates/certs/server.crt"),
    //     ca: fs.readFileSync("certificates/ca/ca.crt"),
    //     requestCert: true,
    //     // rejectUnauthorized: true
    // }
});

server.register({
    register: require('./library/token_auth.js'),
    options: {
        storagePath: __dirname+'/storage/session/'
    }
}, function (err) {
    if (err) {
        console.log('Failed loading plugin', err);
    }
});

server.auth.default('token_auth');

server.views({
    engines: {
        'html': {
            module: require('ejs', true)
        }
    }
});

for(var controllerName in controllers){
	var controller = controllers[controllerName];
	console.log("CONTROLLER: ", controller.name)
	
	for(var route in controller.routes){
		console.log(" -- ", route)
		server.route(controller.routes[route]);
	}
}

server.start();