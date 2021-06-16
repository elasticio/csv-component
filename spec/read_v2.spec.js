process.env.REQUEST_MAX_RETRY = 0;
const { Logger } = require('@elastic.io/component-commons-library');
const { expect } = require('chai');
const nock = require('nock');
const sinon = require('sinon');
const readCSV = require('../lib/triggers/read_v2.js');

const logger = Logger.getLogger();

describe('CSV Read component', async () => {
  let cfg;
  let msg;
  const context = {
    logger,
  };

  nock('http://test.env.mock')
    .get('/formats.csv')
    .times(10)
    .replyWithFile(200, `${__dirname}/../test/formats.csv`);

  it('One file in cfg', async () => {
    msg = {
    };
    cfg = {
      url: 'http://test.env.mock/formats.csv',
      emitAll: true,
      header: true,
      dynamicTyping: true,
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);

    expect(context.emit.callCount)
      .to.equal(1); // one emit call

    expect(context.emit.lastCall.firstArg)
      .to.equal('data'); // with data
  });

  it('Several files in msg', async () => {
    msg = {
      attachments: {
        file1: {
          url: 'http://test.env.mock/formats.csv',
        },
        file2: {
          url: 'http://test.env.mock/formats.csv',
        },
      },
    };
    cfg = {
      emitAll: true,
      header: true,
      dynamicTyping: true,
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);
    expect(context.emit.callCount)
      .to.equal(1); // one emit call

    expect(context.emit.lastCall.firstArg)
      .to.equal('data'); // with data
  });

  it('emitAll: true, header: true, dynamicTyping: true', async () => {
    msg = {
    };
    cfg = {
      url: 'http://test.env.mock/formats.csv',
      emitAll: true,
      header: true,
      dynamicTyping: true,
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
    msg = {
    };
    cfg = {
      url: 'http://test.env.mock/formats.csv',
      emitAll: false,
      header: false,
      dynamicTyping: false,
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);

    expect(context.emit.callCount)
      .to.equal(3); // 3 emit calls

    expect(context.emit.getCall(1).args[1].body.column0)
      .to.equal('2.71828'); // result is number as string
  });

  it('Should fail - no File', async () => {
    msg = {
    };
    cfg = {
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);
    expect(context.emit.getCall(0).firstArg).to.equal('error');
    expect(context.emit.getCall(0).lastArg).to.be.contains('URL of the CSV is missing');
  });

  it('Should fail - 404', async () => {
    msg = {
    };
    cfg = {
      url: 'https://example.com/1.csv',
      emitAll: true,
      header: true,
    };
    context.emit = sinon.spy();
    await readCSV.process.call(context, msg, cfg);
    expect(context.emit.getCall(0).firstArg).to.equal('error');
    expect(context.emit.getCall(0).lastArg).to.be.contains('status code 404');
  });
});
