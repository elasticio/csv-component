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

const write = require('../lib/actions/write.js');

// eslint-disable-next-line func-names
describe('CSV Write component', function () {
  this.timeout(15000);

  let emit;
  let cfg;

  before(async () => {
    cfg = {
      writer: {
        columns: [
          { property: 'header1' },
          { property: 'header2' },
        ],
      },
    };

    nock('https://api.elastic.io', { encodedQueryParams: true })
      .persist()
      .post('/v2/resources/storage/signed-url')
      .reply(200,
        { put_url: 'https://examlple.mock/putUrl', get_url: 'https://examlple.mock/getUrl' });

    nock('https://examlple.mock')
      .persist()
      .put('/putUrl')
      .reply(200, {});
  });

  beforeEach(() => {
    emit = sinon.spy();
  });

  it('should write csv rows', async () => {
    await write.init.call({
      logger,
    }, cfg);

    const msg1 = {
      body: {
        writer: {
          columns: [
            { property: 'text11' },
            { property: 'text12' },
          ],
        },
      },
    };

    await write.process.call({
      emit,
      logger,
    }, msg1, cfg);

    const msg2 = {
      body: {
        reader: {
          columns: [
            { property: 'text21' },
            { property: 'text22' },
          ],
        },
      },
    };
    await write.process.call({ emit, logger }, msg2, cfg);

    expect(emit.getCalls().length).to.equal(2);

    await new Promise((resolve) => setTimeout(resolve, 12000));
    expect(emit.getCalls().length).to.equal(3);
  });
});
