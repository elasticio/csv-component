const events = require('events');
const util = require('util');

function TestRunner(cb) {
  const that = this;
  events.EventEmitter.call(this);
  this.on('end', () => {
    console.log('Ended!');
    cb(that);
  });
  this.data = [];
  this.on('data', (data) => {
    that.data.push(data);
  });
  this.errors = [];
  this.on('error', (err) => {
    that.errors.push(err);
  });
  this.snapshot = undefined;
  this.on('snapshot', (snapshot) => {
    that.snapshot = snapshot;
  });
}

util.inherits(TestRunner, events.EventEmitter);

TestRunner.prototype.info = console.log;

TestRunner.prototype.debug = console.log;

TestRunner.prototype.error = console.error;

TestRunner.prototype.warn = console.log;

exports.runTest = function runTest(func, msg, cfg, callback, snapshot) {
  const runner = new TestRunner(callback);
  func.call(runner, msg, cfg, undefined, snapshot);
};
