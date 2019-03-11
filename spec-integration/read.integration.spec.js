/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const nock = require('nock');

const { runTest } = require('../spec/testrunner.js');
const csv = require('../lib/read.js');

describe('CSV Read component integration tests', () => {
  nock('http://test.env.mock')
    .get('/winter12.csv')
    .replyWithFile(200, `${__dirname}/../test/winter12.csv`);


  it('winter12.csv', (done) => {
    const msg = {};

    const cfg = {
      reader: {
        startRow: 2,
        columns: [
          {
            property: 'material',
            type: 'number',
            format: 'dec_point',
          },
          {
            property: 'gridValue',
            type: 'string',
          },
          {
            property: 'name',
            type: 'string',
          },
          {
            property: 'wholesale',
            type: 'number',
            format: 'dec_point',
          },
          {
            property: 'currency',
            type: 'string',
          },
          {
            property: 'totalAvailability',
            type: 'string',
          },
          {
            property: 'inStock',
            type: 'string',
          },
          {
            property: 'isNewMaterial',
            type: 'string',
          },
          {
            property: 'quantity',
            type: 'string',
          },
          {
            property: 'shipTime',
            type: 'string',
          },
          {
            property: 'season',
            type: 'string',
          },
          {
            property: 'category',
            type: 'string',
          },
          {
            property: 'gender',
            type: 'string',
          },
          {
            property: 'ean',
            type: 'number',
            format: 'dec_point',
          },
          {
            property: 'upc',
            type: 'number',
            format: 'dec_point',
          },
          {
            property: 'upc2',
            type: 'number',
            format: 'dec_point',
          },
          {
            property: 'quality',
            type: 'string',
          },
          {
            property: 'closeout',
            type: 'string',
          },
          {
            property: 'image',
            type: 'string',
          },
          {
            property: 'imageLabel',
            type: 'string',
          },
          {
            property: 'originalImage',
            type: 'string',
          },
        ],
      },
      url: 'http://test.env.mock/winter12.csv',
    };

    runTest(csv.process, msg, cfg, (runner) => {
      expect(runner.data.length).to.equal(461);

      expect(runner.data[456].body).to.deep.equal({
        material: 255179,
        gridValue: '288XS',
        name: 'WB HANGOVER HDD-RUM RAISIN HEATHER/XS',
        wholesale: 36.5,
        currency: 'EUR',
        totalAvailability: '12',
        inStock: '12',
        isNewMaterial: '',
        quantity: '',
        shipTime: '',
        season: 'WINTER 12',
        category: 'TECHNICAL FLEECE',
        gender: 'WOMENS',
        ean: 9009003955813,
        upc: 88605723516,
        upc2: 886057235165,
        quality: '',
        closeout: 'Yes',
        image: 'http://sphere.io/cli/data/255179288_1.jpg',
        imageLabel: '255179288_1',
        // eslint-disable-next-line max-len
        originalImage: 'https://a248.e.akamai.net/f/248/9086/1.ccd/s7diod-isorigin.scene7.com/is/image/Burton/255179288_1?wid=1400&hei=1400&fmt=jpg&qlt=75&op_sharpen=0&resMode=sharp&op_usm=1.0%2C1.0%2C6%2C0&iccEmbed=0',
      });

      expect(runner.data[460].body).to.deep.equal({
        material: 266233,
        gridValue: '001L',
        name: 'PROG. LOWSTACK II LE-BLACK/L',
        wholesale: 78.5,
        currency: 'EUR',
        totalAvailability: '9',
        inStock: '9',
        isNewMaterial: '',
        quantity: '',
        shipTime: '',
        season: 'WINTER 12',
        category: 'BINDINGS',
        gender: 'MENS',
        ean: 9009004122849,
        upc: 88605739477,
        upc2: 886057394770,
        quality: '',
        closeout: 'No',
        image: '',
        imageLabel: '',
        originalImage: '',
      });

      expect(runner.errors.length).to.equal(0);
      expect(runner.snapshot).to.be.undefined;
      done();
    });
  });
});
