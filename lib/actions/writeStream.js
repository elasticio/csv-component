const writeCSV = require('./write');
const { getItemsProperties } = require('../util');

async function writeStream(msg, cfg) {
  const { body } = msg;
  if (body.items === null || typeof body.items !== 'object' || Array.isArray(body.items)) {
    this.logger.error('Input data must be Object');
    this.emit('error', 'Input data must be Object');
    return;
  }
  await writeCSV.process.call(this, msg, cfg);
}

async function getMetaModel(cfg) {
  const metadata = {
    in: {
      type: 'object',
      properties: {
        header: {
          type: 'boolean',
          required: true,
          title: 'Include Headers',
        },
        items: {
          type: 'object',
          required: true,
          title: 'Input Object',
        },
      },
    },
    out: {},
  };

  if (cfg.order) {
    metadata.in.properties.items.properties = getItemsProperties(cfg);
  }
  return metadata;
}

module.exports.process = writeStream;
module.exports.getMetaModel = getMetaModel;
