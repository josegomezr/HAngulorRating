"use strict";
// SELECT *, out.* as from_, in.* as to_ from (SELECT expand(inE('come')) from Sitio)
// 
// SELECT 
// veces as visitas, 
// AVG(out.outE('puntua').comida, null) as from_, 
// in.* as sitio_
// from (SELECT expand(inE('come')) from Sitio)
//
// SELECT in.* as sitio_, out.outE('puntua') as punto_ from (SELECT expand(inE('come')) from Sitio)

// !THIS ONE WORKS!
// SELECT *, in.* as sitio_, avg(comida, servicio, extras) as promedio from (SELECT expand(inE('puntua')) from Sitio)  group by in
// !THIS ONE WORKS!

// SELECT *, inE('come').size() as visitas, inE('puntua').include('servicio', 'extras', 'comida') as puntuaciones from Sitio
// select *, inE('puntua').include('comida', 'servicio', 'extras', 'out') as puntuaciones, inE('puntua') as taster from Sitio

// select *, inE('puntua').include('comida', 'servicio', 'extras', 'out') as puntuaciones as taster from Sitio
var db = require('../database');
var uuid = require('node-uuid');
var _ = require('lodash');
var fs = require('fs');

/**
* HomeHandler
* Carga la vista principal
*
* @function HomeHandler
* @param request
* @param response
*/
function HomeHandler (request, reply) {
    reply.view('views/home.html');
}

/**
* LoginHandler
* Carga la vista principal
*
* @function LoginHandler
* @param request
* @param response
*/
function LoginHandler (request, reply) {
    var username = request.payload.user;
    var password = request.payload.password;

    db.query("SELECT * FROM persona where username = :username and password = :password", {
        params: {username: username, password: password}}).then(function (data) {
        if(data.length == 0){
            reply().code(401)
        }else{

            var authToken = {
                sessionId: uuid.v4(),
                store: {
                    user: data[0]
                },
                userAgent: request.headers['user-agent'],
                remoteAddress: request.info.remoteAddress,
                host: request.info.host
            }

            fs.writeFile(__dirname + '/../storage/session/' + authToken.sessionId, JSON.stringify(authToken));
            
             reply({
                sessionId: authToken.sessionId,
                store: _.pick(data[0], '@rid', 'username', 'nombre')
            });
        }
    });
}

function CheckHandler (request, reply) {
    var auth_token = request.auth.credentials;
    if(_.isEmpty(auth_token))
        return reply().code(401);
    
    var cookieData = {
        sessionId: auth_token.sessionId,
        store: {
            user: _.pick(auth_token.store.user, '@rid', 'username', 'nombre')
        }
    };

    reply(cookieData).code(200);
}

function sendDBError (request, reply, exception) {
    var errorReply = {
        message: 'Error: Unable to get ranking data!'
    };

    if(exception.name == 'OrientDB.RequestError'){
        errorReply.code = 'AuthError';
    }else if(exception.code == 'ECONNREFUSED'){
        errorReply.code = 'ConnectionError';
    }else if(exception.name == 'OrientDB.ConfigError'){
        errorReply.code = 'CfgError';
    }else if(exception.name == 'OrientDB.OperationError'){
        errorReply.code = 'OpError';
    }else if(exception.name == 'OrientDB.ProtocolError'){
        errorReply.code = 'ProtoError';
    }else if(exception.name == 'OrientDB.RecordError'){
        errorReply.code = 'RecordError';
    }else if(exception.name == 'OrientDB.RequestError'){
        errorReply.code = 'RequestError';
    }else{
        errorReply.code = exception.name;
    }

    reply(errorReply).code(503);
}

/**
* RankingHandler
* Carga la vista principal
*
* @function RankingHandler
* @param request
* @param response
*/
function RankingHandler (request, reply) {
    db.query("SELECT *, j_avg(promedio_comida, promedio_servicio, promedio_extras) as promedio_general FROM (SELECT *, j_avg(puntuacion.comida) as promedio_comida, j_avg(puntuacion.servicio) as promedio_servicio, j_avg(puntuacion.extras) as promedio_extras FROM ( SELECT *, inE('puntua').include('comida', 'servicio', 'extras') as puntuacion, in('puntua') as puntuadores FROM Sitio ))").then(function (data) {
        reply(data);
    }, function (e) {
        sendDBError(request, reply, e);
    });
    
}

function DetailHandler (request, reply) {
    db.query("SELECT *, j_avg(promedio_comida, promedio_servicio, promedio_extras) as promedio_general FROM (SELECT *, j_avg(puntuacion.comida) as promedio_comida, j_avg(puntuacion.servicio) as promedio_servicio, j_avg(puntuacion.extras) as promedio_extras FROM ( SELECT @rid.subString(1) as ID, nombre, slug, inE('puntua').include('comida', 'servicio', 'extras', 'fecha') as puntuacion, inE('puntua').out.include('nombre', 'apellido', 'nickname') as taster FROM Sitio )) WHERE slug = :slug", {params: {slug: request.params.localSlug}}).then(function (data) {
        reply(data[0]);
    }, function (e) {
        sendDBError(request, reply, e);
    });
}

function LocalHandler (request, reply) {
    db.query("SELECT * FROM Sitio WHERE slug = :slug", {params: {slug: request.params.localSlug}}).then(function (data) {
        reply(data[0]);
    }, function (e) {
        sendDBError(request, reply, e);
    });
}

function StoreRankHandler (request, reply) {
    var auth_token = request.auth.credentials;
    db.query("SELECT * FROM Sitio WHERE slug = :slug", {params: {slug: request.params.localSlug}}).then(function (data) {
        db.create('EDGE', 'puntua')
        .from(auth_token.store.user['@rid'])
        .to(data[0]['@rid'])
        .set({
            comida: request.query.score_comida,
            servicio: request.query.score_servicio,
            extras: request.query.score_extras,
            fecha: new Date()
        })
        .one()
        .then(function (edge) {
            console.log('created edge:', edge);
            reply(edge);
        });
    }, function (e) {
        sendDBError(request, reply, e);
    });
}

function RegisterHandler (request, reply) {
    var auth_token = request.auth.credentials;
    db.query("SELECT * FROM Sitio WHERE slug = :slug", {params: {slug: request.params.localSlug}}).then(function (data) {
        db.create('EDGE', 'puntua')
        .from(auth_token.store.user['@rid'])
        .to(data[0]['@rid'])
        .set({
            comida: request.query.score_comida,
            servicio: request.query.score_servicio,
            extras: request.query.score_extras,
            fecha: new Date()
        })
        .one()
        .then(function (edge) {
            console.log('created edge:', edge);
            reply(edge);
        });
    }, function (e) {
        sendDBError(request, reply, e);
    });
}

/*** :: Exportando Handlers :: ***/

/** 
* Sets controller name
* 
* @constant {string} controllerName
*/
var controllerName = "Home";

/**
* Exportamos los respectivos handlers 
* @exports HomeController
*/
module.exports = {
    name: controllerName,
    routes: {
        "home.index": {
            method: 'GET',
            path: '/',
            handler: HomeHandler
        },
        "home.login": {
            method: 'POST',
            path: '/login',
            handler: LoginHandler
        },
        "home.auth_check": {
            method: 'GET',
            path: '/check',
            handler: CheckHandler
        },
        "home.ranking": {
            method: 'GET',
            path: '/ranking.json',
            handler: RankingHandler
        },
        "home.ranking.details": {
            method: 'GET',
            path: '/ranking/{localSlug}.json',
            handler: DetailHandler
        },
        "home.local": {
            method: 'GET',
            path: '/local/{localSlug}.json',
            handler: LocalHandler
        },
        "home.store_rank": {
            method: 'POST',
            path: '/save_rank/{localSlug}/',
            handler: StoreRankHandler
        },
        "home.static": {
            method: 'GET',
            path: '/{param*}',
            handler: {
                directory: {
                    path: 'public',
                    listing: true
                }
            }
        }
    }
}