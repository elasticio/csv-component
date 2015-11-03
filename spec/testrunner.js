var events = require('events');
var util = require('util');

function TestRunner(cb) {
    var that = this;
    events.EventEmitter.call(this);
    this.on("end", function () {
        console.log('Ended!');
        cb(that);
    });
    this.data = [];
    this.on('data', function (data) {
        that.data.push(data);
    });
    this.errors = [];
    this.on('error', function (err) {
        that.errors.push(err);
    });
    this.snapshot = undefined;
    this.on('snapshot', function (snapshot) {
        that.snapshot = snapshot;
    });
}

util.inherits(TestRunner, events.EventEmitter);

TestRunner.prototype.info = console.log;

TestRunner.prototype.debug = console.log;

TestRunner.prototype.error = console.error;

TestRunner.prototype.warn = console.log;

var runTest = function (func, msg, cfg, callback, snapshot) {
    var runner = new TestRunner(callback);
    func.call(runner, msg, cfg, undefined, snapshot);
};

exports.runTest = runTest;