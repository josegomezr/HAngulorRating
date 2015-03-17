var Oriento = require('oriento');

var server = Oriento({
  host: 'localhost',
  port: 2424,
  username: 'root',
  password: 'veca3150'
});

var db = server.use('agenda');

module.exports = db;