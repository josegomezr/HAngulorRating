"use strict";
var fs          = require("fs");
var path        = require("path");
var env         = process.env.NODE_ENV || "development";

var controllers = {};

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js");
  })
  .forEach(function(file) {
    var controller = require(path.join(__dirname, file));
    controllers[controller.name] = controller;
  });

module.exports = controllers;