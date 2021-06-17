process.env.REQUEST_MAX_RETRY = 0;
const { Logger } = require('@elastic.io/component-commons-library');
const { expect } = require('chai');
const nock = require('nock');
const sinon = require('sinon');
const readCSV = require('../lib/actions/read.js');

const logger = Logger.getLogger();

describe('CSV Read component', async () => {
  let cfg;
  const msg = {};
  const context = {
    logger,
  };

  nock('http://test.env.mock')
    .get('/formats.csv')
    .times(10)
    .replyWithFile(200, `${__dirname}/../test/formats.csv`);

  it('One file', async () => {
    msg.body = {
      url: 'http://test.env.mock/formats.csv',
      header: true,
      dynamicTyping: true,
      delimiter: '',
    };
    cfg = {
      emitAll: true,
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);

    expect(context.emit.callCount)
      .to.equal(1); // one emit call

    expect(context.emit.lastCall.firstArg)
      .to.equal('data'); // with data
  });

  it('emitAll: true, header: true, dynamicTyping: true', async () => {
    msg.body = {
      url: 'http://test.env.mock/formats.csv',
      header: true,
      dynamicTyping: true,
    };
    cfg = {
      emitAll: true,
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);

    expect(context.emit.callCount)
      .to.equal(1); // one emit call

    expect(context.emit.getCall(0).args[1].body.result.length)
      .to.equal(2); // result is array with 2 records

    expect(context.emit.getCall(0).args[1].body.result[0].Text)
      .to.equal('Lorem ipsum dolor sit amet'); // with text

    expect(context.emit.getCall(0).args[1].body.result[0].Number)
      .to.equal(2.71828); // Number
  });

  it('emitAll: false, header: false, dynamicTyping: false', async () => {
    msg.body = {
      url: 'http://test.env.mock/formats.csv',
      header: false,
      dynamicTyping: false,
    };
    cfg = {
      emitAll: false,
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);

    expect(context.emit.callCount)
      .to.equal(3); // 3 emit calls

    expect(context.emit.getCall(1).args[1].body.column0)
      .to.equal('2.71828'); // result is number as string
  });

  it('Should fail - no File', async () => {
    msg.body = {
    };
    cfg = {
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);
    expect(context.emit.getCall(0).firstArg).to.equal('error');
    expect(context.emit.getCall(0).lastArg).to.be.contains('URL of the CSV is missing');
  });

  it('Should fail - 404', async () => {
    msg.body = {
      url: 'https://example.com/1.csv',
      header: true,
    };
    cfg = {
      emitAll: true,
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);
    expect(context.emit.getCall(0).firstArg).to.equal('error');
    expect(context.emit.getCall(0).lastArg).to.be.contains('status code 404');
  });
});
