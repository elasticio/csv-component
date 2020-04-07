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

describe('CSV Write From Array component', function () {
  this.timeout(15000);

  let emit;
  let cfg;

  before(async () => {
    cfg = {
      includeHeaders: 'Yes',
      separator: 'semicolon',
    };

    nock('https://api.elastic.io', { encodedQueryParams: true })
      .post('/v2/resources/storage/signed-url')
      .reply(200,
        { put_url: 'https://examlple.mock/putUrl', get_url: 'https://examlple.mock/getUrl' });

    nock('https://examlple.mock')
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

    const msg = {
      body: [
        {
          ProductKey: 'text11',
          CategoryGroup_1: 'text12',
        },
        {
          ProductKey: 'text21',
          CategoryGroup_1: 'text22',
        }],
    };

    await write.process.call({
      emit,
      logger,
    }, msg, cfg);

    expect(emit.getCalls().length).to.equal(2);
  });
});
