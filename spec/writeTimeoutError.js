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
const writeFromJson = require('../lib/actions/writeFromJson.js');

// eslint-disable-next-line func-names
describe('CSV Write Timeout', function () {
  this.timeout(180000);

  let emit;
  let cfg;

  before(async () => {
    nock('https://api.elastic.io', { encodedQueryParams: true })
      .post('/v2/resources/storage/signed-url')
      .reply(200,
        { put_url: 'https://examlple.mock/putUrl', get_url: 'https://examlple.mock/getUrl' })
      .persist();

    nock('https://examlple.mock')
      .put('/putUrl')
      .reply(200, {})
      .persist();
  });

  beforeEach(() => {
    emit = sinon.spy();
  });

  describe('raw', () => {
    before(() => {
      cfg = {
        writer: {
          columns: [
            { property: 'header1' },
            { property: 'header2' },
          ],
        },
      };
    });

    it('should write', async () => {
      await write.init.call({
        logger,
      }, cfg);

      const msg1 = {
        body: {
          inputObject: {
            ProductKey: 'text11',
            CategoryGroup_1: 'text12',
          },
        },
      };

      for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
        await write.process.call({
          emit,
          logger,
        }, msg1, cfg);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await new Promise((resolve) => setTimeout(resolve, 12000));
      expect(emit.getCalls().length).to.equal(4);
      expect(emit.getCalls().filter((call) => call.args[0] === 'data').length).to.equal(1);
      for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
        await write.process.call({
          emit,
          logger,
        }, msg1, cfg);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await new Promise((resolve) => setTimeout(resolve, 12000));
      expect(emit.getCalls().length).to.equal(8);
      expect(emit.getCalls().filter((call) => call.args[0] === 'data').length).to.equal(2);
    });
  });

  describe('From Object', () => {
    before(() => {
      cfg = {
        includeHeaders: 'Yes',
        separator: 'semicolon',
      };
    });

    it('should write from object', async () => {
      await writeFromJson.init.call({
        logger,
      }, cfg);

      const msg1 = {
        body: {
          inputObject: {
            ProductKey: 'text11',
            CategoryGroup_1: 'text12',
          },
        },
      };

      for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
        await writeFromJson.process.call({
          emit,
          logger,
        }, msg1, cfg);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await new Promise((resolve) => setTimeout(resolve, 12000));
      expect(emit.getCalls().length).to.equal(4);
      expect(emit.getCalls().filter((call) => call.args[0] === 'data').length).to.equal(1);
      for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
        await writeFromJson.process.call({
          emit,
          logger,
        }, msg1, cfg);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await new Promise((resolve) => setTimeout(resolve, 12000));
      expect(emit.getCalls().length).to.equal(8);
      expect(emit.getCalls().filter((call) => call.args[0] === 'data').length).to.equal(2);
    });
  });
});
