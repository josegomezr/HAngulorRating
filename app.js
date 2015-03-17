var Hapi = require('hapi');
var server = new Hapi.Server();
var controllers = require('./controllers');

server.connection({ 
    port: 8000 
});

server.views({
    engines: {
        'html': {
            module: require('ejs')
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