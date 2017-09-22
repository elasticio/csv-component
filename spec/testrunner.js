'use strict';

let events = require('events');
let util = require('util');

function TestRunner(cb) {
    let that = this;
    events.EventEmitter.call(this);
    this.on('end', function onEnd() {
        console.log('Ended!');
        cb(that);
    });
    this.data = [];
    this.on('data', function onData(data) {
        that.data.push(data);
    });
    this.errors = [];
    this.on('error', function onError(err) {
        that.errors.push(err);
    });
    this.snapshot = undefined;
    this.on('snapshot', function onSnapshot(snapshot) {
        that.snapshot = snapshot;
    });
}

util.inherits(TestRunner, events.EventEmitter);

TestRunner.prototype.info = console.log;

TestRunner.prototype.debug = console.log;

TestRunner.prototype.error = console.error;

TestRunner.prototype.warn = console.log;

exports.runTest = function runTest(func, msg, cfg, callback, snapshot) {
    let runner = new TestRunner(callback);
    func.call(runner, msg, cfg, undefined, snapshot);
};
