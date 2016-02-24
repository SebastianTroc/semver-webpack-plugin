"use strict";

var semver = require("semver");
var fs = require("fs");
var cmdArgs = require('command-line-args');
var args = {};
try {
  args = cmdArgs([
    {name: 'semver-webpack-plugin-disable', type: Boolean, defaultValue: false},
    {name: 'semver-webpack-plugin-inc-args', type: String}
  ]).parse();
}
catch (e) {}

function SemverWebpackPlugin(options) {
  if (args["semver-webpack-plugin-disable"]) {
    return;
  }

  this.options = options || {};
  this.options.files = this.options.files || [];

  var incArgs = this.extractIncArgs();
  var files = this.options.files;
  if (files.length === 0) {
    throw new Error("`files` must have at least one file");
  }

  var done = this.options.done;
  var outMap = new Map();
  files.forEach(function (file) {
    var f = require(file);
    if (incArgs.length === 2) {//TODO refactor `inc` params
      f.version = semver.inc(f.version, incArgs[0], incArgs[1]);
    }
    else if (incArgs.length === 1) {
      f.version = semver.inc(f.version, incArgs[0]);
    }
    outMap.set(file, f);
    fs.writeFileSync(file, JSON.stringify(f, null, 2));
    (typeof done === "function") && done(f);
  });

  this.outMap = outMap;
}

SemverWebpackPlugin.prototype.extractIncArgs = function() {
  var incArgs = args["semver-webpack-plugin-inc-args"];
  if (incArgs) {
    incArgs = incArgs.split(",");
  }
  incArgs = incArgs || this.options.incArgs || [];
  if (incArgs.length > 2) {
    throw new Error("`incArgs` must have one or two params");
  }
  return incArgs;
};

SemverWebpackPlugin.prototype.apply = function (compiler) {
  if (args["semver-webpack-plugin-disable"]) {
    return;
  }

  var outMap = this.outMap;
  compiler.plugin("emit", function (compilation, callback) {
    outMap.forEach((json, file) => {
      compilation.assets[file] = {
        source: function () {return new Buffer(JSON.stringify(json, null, 2));},
        size: function () {return Buffer.byteLength(this.source(), 'utf8'); }
      };
    });
    callback();
  });
};

module.exports = SemverWebpackPlugin;