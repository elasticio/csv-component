process.env.TIMEOUT_BETWEEN_EVENTS = 200;
const { Logger, AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { expect } = require('chai');
const sinon = require('sinon');
const writeArray = require('../lib/actions/writeArray.js');
const writeStream = require('../lib/actions/writeStream.js');

const logger = Logger.getLogger();

const context = {
  emit: sinon.spy(),
  logger,
};

describe('CSV Write component', async () => {
  afterEach(() => {
    context.emit.resetHistory();
  });

  let cfg;
  const msg = {};
  const item = {
    a: '🙈', b: '🙉', c: '🙊', d: '😂',
  };

  sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment').returns({
    config: {
      url: 'someUrl',
    },
  });

  it('Input is one array of 2 objects', async () => {
    msg.body = {
      items: [item, item],
      header: true,
    };
    cfg = {
      uploadToAttachment: false,
      separator: '',
      order: '',
    };
    context.emit = sinon.spy();

    await writeArray.process.call(context, msg, cfg);
    expect(context.emit.callCount)
      .to.equal(1); // one emit call
    expect(context.emit.args[0][1].body.csvString)
      .to.equal('a,b,c,d\r\n🙈,🙉,🙊,😂\r\n🙈,🙉,🙊,😂'); // with text
  });

  it('Input is not array (call writeArray function)', async () => {
    msg.body = {
      items: {},
      header: true,
    };
    cfg = {
    };
    context.emit = sinon.spy();

    await writeArray.process.call(context, msg, cfg);
    expect(context.emit.args[0][0])
      .to.equal('error');
    expect(context.emit.args[0][1])
      .to.be.contains('Input data must be Array');
  });

  it('Input is empty array', async () => {
    msg.body = {
      items: [],
      header: true,
    };
    cfg = {
    };
    context.emit = sinon.spy();

    await writeArray.process.call(context, msg, cfg);
    expect(context.emit.args[0][0])
      .to.equal('error');
    expect(context.emit.args[0][1])
      .to.be.contains('Empty Array');
  });

  it('Input is not Object (call writeStream function)', async () => {
    msg.body = {
      items: [],
      header: true,
    };
    cfg = {
    };
    context.emit = sinon.spy();

    await writeStream.process.call(context, msg, cfg);
    expect(context.emit.args[0][0])
      .to.equal('error');
    expect(context.emit.args[0][1])
      .to.be.contains('Input data must be Object');
  });

  it('Input is one array of 1000000 objects', async () => {
    const arr = [];
    for (let i = 1; i <= 1000000; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      arr.push(item);
    }
    msg.body = {
      items: arr,
      header: true,
    };
    cfg = {
      uploadToAttachment: false,
      separator: '',
      order: '',
    };
    context.emit = sinon.spy();

    await writeArray.process.call(context, msg, cfg);
    expect(context.emit.callCount)
      .to.equal(1); // one emit call
  }).timeout(10000);

  it('Input is one objects, call function 2 times before timeout', async () => {
    msg.body = {
      items: item,
      header: true,
    };
    cfg = {
      uploadToAttachment: false,
      separator: '',
      order: '',
    };
    context.emit = sinon.spy();

    await writeStream.process.call(context, msg, cfg);
    await writeStream.process.call(context, msg, cfg);

    await new Promise((resolve) => setTimeout(resolve, 201));
    expect(context.emit.callCount)
      .to.equal(1); // one emit call
    expect(context.emit.args[0][1].body.csvString)
      .to.equal('a,b,c,d\r\n🙈,🙉,🙊,😂\r\n🙈,🙉,🙊,😂'); // with text
  });

  it('Input is one objects, call function 1000000 times before timeout', async () => {
    msg.body = {
      items: item,
      header: true,
    };
    cfg = {
      uploadToAttachment: false,
      separator: '',
      order: 'd,a',
    };
    context.emit = sinon.spy();
    for (let i = 1; i <= 1000000; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await writeStream.process.call(context, msg, cfg);
    }

    await new Promise((resolve) => setTimeout(resolve, 201));
    expect(context.emit.callCount)
      .to.equal(1); // one emit call
  }).timeout(10000);

  it('Output is file in attachments', async () => {
    msg.body = {
      items: [item, item],
      header: true,
    };
    cfg = {
      uploadToAttachment: true,
      separator: '',
      order: '',
    };
    context.emit = sinon.spy();

    await writeArray.process.call(context, msg, cfg);
    expect(context.emit.callCount)
      .to.equal(1); // one emit call
    expect(context.emit.args[0][1].body.size)
      .to.equal(49);
    expect(context.emit.args[0][1].body.attachmentUrl)
      .to.equal('someUrl');
    expect(context.emit.args[0][1].body.contentType)
      .to.equal('text/csv');
    expect(context.emit.args[0][1].body.type)
      .to.equal('.csv');
  });

  it('Output without header', async () => {
    msg.body = {
      items: [item, item],
      header: false,
    };
    cfg = {
      uploadToAttachment: false,
      separator: '',
      order: '',
    };
    context.emit = sinon.spy();

    await writeArray.process.call(context, msg, cfg);
    expect(context.emit.args[0][1].body.csvString)
      .to.equal('🙈,🙉,🙊,😂\r\n🙈,🙉,🙊,😂'); // with text
  });

  it('Custom separator - ";"', async () => {
    msg.body = {
      items: [item, item],
      header: true,
    };
    cfg = {
      uploadToAttachment: false,
      separator: ';',
      order: '',
    };
    context.emit = sinon.spy();

    await writeArray.process.call(context, msg, cfg);
    expect(context.emit.args[0][1].body.csvString)
      .to.equal('a;b;c;d\r\n🙈;🙉;🙊;😂\r\n🙈;🙉;🙊;😂');// with text
  });

  it('Custom order', async () => {
    msg.body = {
      items: [item, item],
      header: true,
    };
    cfg = {
      uploadToAttachment: false,
      separator: '',
      order: 'd,a',
    };
    context.emit = sinon.spy();

    await writeArray.process.call(context, msg, cfg);
    expect(context.emit.args[0][1].body.csvString)
      .to.equal('d,a\r\n😂,🙈\r\n😂,🙈'); // with text
  });

  it('Custom order and separator', async () => {
    msg.body = {
      items: [item, item],
      header: true,
    };
    cfg = {
      uploadToAttachment: false,
      separator: ';',
      order: 'd;a',
    };
    context.emit = sinon.spy();

    await writeArray.process.call(context, msg, cfg);
    expect(context.emit.args[0][1].body.csvString)
      .to.equal('d;a\r\n😂;🙈\r\n😂;🙈'); // with text
  });

  it('Metadata test - in', async () => {
    cfg = {
      separator: ';',
      order: 'd;a',
    };

    const metadataStream = writeStream.getMetaModel(cfg);
    const metadataArray = writeArray.getMetaModel(cfg);

    expect(metadataStream.in.properties.items.properties.a.title)
      .to.equal('a');

    expect(metadataArray.in.properties.items.items.properties.a.title)
      .to.equal('a');
  });

  it('Metadata test - out', async () => {
    const metadataStream = writeStream.getMetaModel({ uploadToAttachment: false });
    const metadataStreamUpload = writeStream.getMetaModel({ uploadToAttachment: true });
    const metadataArray = writeStream.getMetaModel({ uploadToAttachment: false });
    const metadataArrayUpload = writeArray.getMetaModel({ uploadToAttachment: true });

    expect(metadataStream.out.properties.csvString.required).to.equal(true);
    expect(metadataStreamUpload.out.properties.attachmentUrl.required).to.equal(true);
    expect(metadataArray.out.properties.csvString.required).to.equal(true);
    expect(metadataArrayUpload.out.properties.attachmentUrl.required).to.equal(true);
  });
});
