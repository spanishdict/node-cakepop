####
# CakePop!
####
child_proc  = require 'child_process'

async       = require 'async'
colors      = require 'colors'

# Colors configuration
colors.setTheme
  silly:    'rainbow'
  input:    'grey'
  verbose:  'cyan'
  prompt:   'grey'
  info:     'green'
  data:     'grey'
  help:     'cyan'
  warn:     'yellow'
  debug:    'blue'
  error:    'red'

class Utils

  # Log to console if non-empty string.
  #
  # @param [String] data String to print.
  #
  @print: (data) ->
    data = (data ? "").toString().replace /[\r\n]+$/, ""
    console.log data if data

  # Print error of data message.
  #
  # @param [Object] err   Error.
  # @param [String] data  String to print.
  #
  @printCallback: (err, data) =>
    @print err ? (data ? "Done.").toString()

  # Log failure and exit process.
  #
  # @param [String] msg Failure message.
  #
  @fail: (msg) ->
    process.stderr.write "#{msg}\n".error.bold if msg
    process.exit 1

  # Spawn with log pipes to stdout, stderr.
  #
  # @param [String]         cmd       Command / binary path.
  # @param [Array<String>]  args      Array of arguments to command.
  # @param [Function]       callback  Callback on process end (or null).
  #
  @spawn: (cmd, args = [], callback = null) =>
    @print [cmd, args.join " "].join " "
    ps = child_proc.spawn cmd, args
    ps.stdout.pipe process.stdout
    ps.stderr.pipe process.stderr
    ps.on "exit", callback if callback

  # Exec with log hooks to stdout, stderr.
  #
  # @param [String]   cmd       Command and arguments.
  # @param [Function] callback  Callback on process end (printCallback).
  #
  @exec: (cmd, callback = @printCallback) =>
    @print cmd
    child_proc.exec cmd, (error, stdout, stderr) ->
      process.stderr.write stderr if stderr
      callback error, stdout.toString()

  # Return list of process id's matching egrep pattern.
  #
  # @param [String]   pattern   Egrep pattern.
  # @param [Function] callback  Callback on process end (printCallback).
  #
  @pids: (pattern, callback = @print) =>
    @exec "ps ax | egrep \"#{pattern}\" | egrep -v egrep", (err, matches) ->
      matches = matches?.split("\n") ? []
      callback err, (m.match(/\s*([0-9]+)/)[0] for m in matches when m)

  # Return list of files matching egrep pattern.
  #
  # @param [Array<String>]  dirs      Array of directories (default: ["./"]).
  # @param [String]         pattern   Egrep pattern.
  # @param [Function]       callback  Callback on process end (printCallback).
  #
  @find: (dirs = ["./"], pattern, callback = @printCallback) =>
    finder = (dir, cb) =>
      @exec "find \"#{dir}\" -name \"#{pattern}\"", (err, files) ->
        files = files?.split("\n") ? []
        cb err, (f for f in files when f)

    async.map dirs, finder, (err, results) =>
      # Merge arrays
      files = []
      if not err
        files = files.concat r for r in results

      callback err, files

class Style

  # Run coffeelint on an array of files, directory paths.
  #
  # @param  [Array<String>]   paths     Array of file / directory paths.
  # @param  [Object]          opts      Options.
  # @option options [String]  suffix    CoffeeScript file suffix ("coffee").
  # @option options [String]  config    Path to coffeelint config file.
  # @param  [Function]        callback  Callback on process end (printCallback).
  #
  @coffeelint: (paths = [], opts = {}, callback = Utils.printCallback) ->
    suffix  = opts.suffix ? "coffee"
    filesRe = new RegExp ".*\.#{suffix}$"
    isCs    = (name) -> name is "Cakefile" or filesRe.test name

    config  = if opts.config then ["--file", opts.config] else []
    files   = (f for f in paths when isCs f)
    dirs    = (f for f in paths when not isCs f)

    cbs =
      searchDirs: (cb) ->
        if dirs.length > 0
          Utils.find dirs, "*.#{suffix}", (err, dirFiles) ->
            cb err, dirFiles

        else
          # No directories to search.
          cb null, []

      runLint: ["searchDirs", (cb, results) ->
        dirFiles = results.searchDirs
        args = files.concat(dirFiles).concat(config)
        Utils.spawn "coffeelint", args, (code) =>
          err = if code is 0 then null else new Error "coffeelint failed"
          cb err
      ]

    async.auto cbs, (err) ->
      Utils.fail   "CoffeeScript style checks failed." if err
      Utils.print  "CoffeeScript style checks passed.\n".info
      callback err if callback

module.exports =
  utils: Utils
  style: Style
