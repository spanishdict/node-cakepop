// Generated by CoffeeScript 1.3.1
(function() {
  var CoffeeBuild, Style, Utils, async, child_proc, colors, extend, fileUtils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  child_proc = require('child_process');

  async = require('async');

  colors = require('colors');

  extend = require('deep-extend');

  fileUtils = require('file-utils');

  colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
  });

  Utils = (function() {

    Utils.name = 'Utils';

    function Utils() {}

    Utils.print = function(data) {
      data = (data != null ? data : "").toString().replace(/[\r\n]+$/, "");
      if (data) {
        return console.log(data);
      }
    };

    Utils.printCallback = function(err, data) {
      return Utils.print(err != null ? err : (data != null ? data : "Done.").toString());
    };

    Utils.fail = function(msg) {
      if (msg) {
        process.stderr.write(("" + msg + "\n").error.bold);
      }
      return process.exit(1);
    };

    Utils.spawn = function(cmd, args, callback) {
      var ps;
      if (args == null) {
        args = [];
      }
      if (callback == null) {
        callback = null;
      }
      Utils.print([cmd, args.join(" ")].join(" "));
      ps = child_proc.spawn(cmd, args);
      ps.stdout.pipe(process.stdout);
      ps.stderr.pipe(process.stderr);
      if (callback) {
        return ps.on("exit", callback);
      }
    };

    Utils.exec = function(cmd, callback) {
      if (callback == null) {
        callback = Utils.printCallback;
      }
      Utils.print(cmd);
      return child_proc.exec(cmd, function(error, stdout, stderr) {
        if (stderr) {
          process.stderr.write(stderr);
        }
        return callback(error, stdout.toString());
      });
    };

    Utils.pids = function(pattern, callback) {
      if (callback == null) {
        callback = Utils.printCallback;
      }
      return Utils.exec("ps ax | egrep \"" + pattern + "\" | egrep -v egrep", function(err, matches) {
        var m, _ref;
        matches = (_ref = matches != null ? matches.split("\n") : void 0) != null ? _ref : [];
        return callback(err, (function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = matches.length; _i < _len; _i++) {
            m = matches[_i];
            if (m) {
              _results.push(m.match(/\s*([0-9]+)/)[0]);
            }
          }
          return _results;
        })());
      });
    };

    Utils.find = function(dirs, pattern, callback) {
      var finder;
      if (dirs == null) {
        dirs = ["./"];
      }
      if (callback == null) {
        callback = Utils.printCallback;
      }
      finder = function(dir, cb) {
        var file, filter, paths;
        if (typeof pattern === 'string') {
          pattern = new RegExp(pattern);
        }
        paths = [];
        file = new fileUtils.File(dir);
        filter = function(name, path) {
          if (pattern.test(name)) {
            paths.push(path);
          }
          return true;
        };
        return file.list(filter, function(err) {
          return cb(err, paths);
        });
      };
      return async.map(dirs, finder, function(err, results) {
        var files, r, _i, _len;
        files = [];
        if (!err) {
          for (_i = 0, _len = results.length; _i < _len; _i++) {
            r = results[_i];
            files = files.concat(r);
          }
        }
        return callback(err, files);
      });
    };

    return Utils;

  }).call(this);

  CoffeeBuild = (function() {

    CoffeeBuild.name = 'CoffeeBuild';

    function CoffeeBuild(opts) {
      this.watch = __bind(this.watch, this);

      this.build = __bind(this.build, this);

      this._build = __bind(this._build, this);

      var defaults, _ref;
      defaults = {
        coffee: {
          bin: "coffee",
          suffix: "coffee"
        }
      };
      this.coffee = extend(defaults.coffee, (_ref = opts != null ? opts.coffee : void 0) != null ? _ref : {});
    }

    CoffeeBuild.prototype._build = function(paths, watch, callback) {
      var argsBase, build, buildDir, cbs, dirs, files, p,
        _this = this;
      files = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = paths.length; _i < _len; _i++) {
          p = paths[_i];
          if (typeof p === 'string') {
            _results.push(p);
          }
        }
        return _results;
      })();
      dirs = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = paths.length; _i < _len; _i++) {
          p = paths[_i];
          if (typeof p !== 'string') {
            _results.push(p);
          }
        }
        return _results;
      })();
      argsBase = watch ? ["--watch"] : [];
      build = function(args, cb) {
        return Utils.spawn("" + _this.coffee.bin, argsBase.concat(args), function(code) {
          var err;
          err = code === 0 ? null : new Error("build failed");
          return cb(err);
        });
      };
      buildDir = function(pair, cb) {
        var dst, src;
        src = Object.keys(pair)[0];
        dst = pair[src];
        return build(["--compile", "--output", dst, src], cb);
      };
      cbs = {
        buildFiles: function(cb) {
          if (files.length < 1) {
            return cb(null);
          }
          return build(["--compile"].concat(files), cb);
        },
        buildDirs: function(cb) {
          return async.forEach(dirs, buildDir, cb);
        }
      };
      return async.parallel(cbs, function(err) {
        return callback(err);
      });
    };

    CoffeeBuild.prototype.build = function(paths, callback) {
      if (paths == null) {
        paths = [];
      }
      if (callback == null) {
        callback = Utils.printCallback;
      }
      return this._build(paths, false, callback);
    };

    CoffeeBuild.prototype.watch = function(paths, callback) {
      if (paths == null) {
        paths = [];
      }
      if (callback == null) {
        callback = Utils.printCallback;
      }
      return this._build(paths, true, callback);
    };

    return CoffeeBuild;

  })();

  Style = (function() {

    Style.name = 'Style';

    function Style(opts) {
      this.coffeelint = __bind(this.coffeelint, this);

      var defaults, _ref;
      defaults = {
        coffee: {
          bin: "coffeelint",
          suffix: "coffee",
          config: null
        }
      };
      this.coffee = extend(defaults.coffee, (_ref = opts != null ? opts.coffee : void 0) != null ? _ref : {});
    }

    Style.prototype.coffeelint = function(paths, callback) {
      var cbs, config, dirs, f, files, filesRe,
        _this = this;
      if (paths == null) {
        paths = [];
      }
      if (callback == null) {
        callback = Utils.printCallback;
      }
      filesRe = new RegExp("(Cakefile|.*\." + this.coffee.suffix + ")$");
      config = this.coffee.config ? ["--file", this.coffee.config] : [];
      files = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = paths.length; _i < _len; _i++) {
          f = paths[_i];
          if (filesRe.test(f)) {
            _results.push(f);
          }
        }
        return _results;
      })();
      dirs = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = paths.length; _i < _len; _i++) {
          f = paths[_i];
          if (!filesRe.test(f)) {
            _results.push(f);
          }
        }
        return _results;
      })();
      cbs = {
        searchDirs: function(cb) {
          if (dirs.length < 1) {
            return cb(null, []);
          }
          return Utils.find(dirs, filesRe, function(err, dirFiles) {
            return cb(err, dirFiles);
          });
        },
        runLint: [
          "searchDirs", function(cb, results) {
            var args, dirFiles, _ref;
            dirFiles = (_ref = results != null ? results.searchDirs : void 0) != null ? _ref : [];
            args = [config, files, dirFiles].reduce(function(x, y) {
              return x.concat(y);
            });
            return Utils.spawn("" + _this.coffee.bin, args, function(code) {
              var err;
              err = code === 0 ? null : new Error("coffeelint failed");
              return cb(err);
            });
          }
        ]
      };
      return async.auto(cbs, function(err) {
        if (err) {
          Utils.fail("CoffeeScript style checks failed.");
        }
        Utils.print("CoffeeScript style checks passed.\n".info);
        return callback(err);
      });
    };

    return Style;

  })();

  module.exports = {
    utils: Utils,
    CoffeeBuild: CoffeeBuild,
    Style: Style
  };

}).call(this);
