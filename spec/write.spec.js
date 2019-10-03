/* eslint-disable no-unused-vars */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs = require('fs');
const nock = require('nock');
const sinon = require('sinon');

chai.use(chaiAsPromised);
const { expect } = require('chai');

const write = require('../lib/actions/write.js');

describe('CSV Write component', function () {
  this.timeout(15000);

  let emitter;
  let cfg;

  beforeEach(() => {
    emitter = {
      emit: sinon.spy(),
    };
  });

  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }

    cfg = {
      writer: {
        columns: [
          { property: 'header1' },
          { property: 'header2' },
        ],
      },
    };

    nock('http://api-service.platform.svc.cluster.local.:9000/', { encodedQueryParams: true })
      .post('/v2/resources/storage/signed-url')
      .reply(200, { put_url: 'https://examlple.mock/putUrl', get_url: 'https://examlple.mock/getUrl' });

    nock('https://examlple.mock')
      .put('/putUrl')
      .reply(200, {});
  });

  it('should parse simple string rows', async (done) => {
    // await write.init(cfg);

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
    // await write.process.call(emitter, msg1, cfg);

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
    // await write.process.call(emitter, msg2, cfg);

    // expect(emitter.emit.getCalls().length).to.equal(2);

    // await new Promise(resolve => setTimeout(resolve, 12000));
    // expect(emitter.emit.getCalls().length).to.equal(3);

    done();
  });
});
