/* eslint-disable no-unused-vars */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const nock = require('nock');
const sinon = require('sinon');
const logger = require('@elastic.io/component-logger')();

chai.use(chaiAsPromised);
const { expect } = require('chai');

if (fs.existsSync('.env')) {
  // eslint-disable-next-line global-require
  require('dotenv').config();
} else {
  process.env.ELASTICIO_API_USERNAME = 'name';
  process.env.ELASTICIO_API_KEY = 'key';
}

const write = require('../lib/actions/writeFromArray.js');

// eslint-disable-next-line func-names
describe('CSV Write From Array component', function () {
  this.timeout(15000);

  let emit;
  let cfg;

  beforeEach(() => {
    emit = sinon.spy();
    nock.cleanAll();

    cfg = {
      includeHeaders: 'Yes',
      separator: 'semicolon',
    };

    nock('https://api.elastic.io', { encodedQueryParams: true })
      .post('/v2/resources/storage/signed-url')
      .reply(200,
        { put_url: 'https://examlple.mock/putUrl', get_url: 'https://examlple.mock/getUrl' });

    nock('https://examlple.mock')
      .put('/putUrl', 'name;email;age;key1;not an age;not an age at all\n'
            + 'Bob;bob@email.domain;30;1;;\n'
            + 'Joe;joe@email.domain;11;;;322')
      .reply(200, {});
  });

  afterEach(() => {
    expect(nock.isDone()).to.be.equal(true);
  });

  it('should write csv rows', async () => {
    const msg = {
      body: {
        inputArray: [
          {
            name: 'Bob',
            email: 'bob@email.domain',
            age: 30,
            key1: true,
            'not an age': null,
            'not an age at all': undefined,
          },
          {
            name: 'Joe',
            email: 'joe@email.domain',
            age: 11,
            'not an age at all': 322,
          },
        ],
      },
    };

    await write.process.call({
      emit,
      logger,
    }, msg, cfg);

    expect(emit.getCalls().length).to.equal(2);
  });

  it('should handle two messages rows', async () => {
    nock('https://api.elastic.io', { encodedQueryParams: true })
      .post('/v2/resources/storage/signed-url')
      .reply(200,
        { put_url: 'https://examlple.mock/putUrl2', get_url: 'https://examlple.mock/getUrl2' });

    nock('https://examlple.mock')
      .put('/putUrl2', 'foo;fooz\n'
            + 'bar1;barz1\n'
            + 'bar2;barz2')
      .reply(200, {});

    const msg1 = {
      body: {
        inputArray: [
          {
            name: 'Bob',
            email: 'bob@email.domain',
            age: 30,
            key1: true,
            'not an age': null,
            'not an age at all': undefined,
          },
          {
            name: 'Joe',
            email: 'joe@email.domain',
            age: 11,
            'not an age at all': 322,
          },
        ],
      },
    };

    const msg2 = {
      body: {
        inputArray: [
          {
            foo: 'bar1',
            fooz: 'barz1',
          },
          {
            foo: 'bar2',
            fooz: 'barz2',
          },
        ],
      },
    };

    await write.process.call({
      emit,
      logger,
    }, msg1, cfg);
    await write.process.call({
      emit,
      logger,
    }, msg2, cfg);

    expect(emit.getCalls().length).to.equal(4);
  });
});
