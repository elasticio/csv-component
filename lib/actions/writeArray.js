const writeCSV = require('./write');
const { getItemsProperties, getOut } = require('../util');

async function writeArray(msg, cfg) {
  const { body } = msg;
  if (!Array.isArray(body.items)) {
    this.logger.error('Input data must be Array');
    this.emit('error', 'Input data must be Array');
    return;
  }
  if (body.items.length < 1) {
    this.logger.error('Empty Array');
    this.emit('error', 'Empty Array');
    return;
  }
  await writeCSV.process.call(this, msg, cfg);
}

function getMetaModel(cfg) {
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
          type: 'array',
          required: true,
          title: 'Input Array',
          items: {
            type: 'object',
            required: true,
            properties: {
            },
          },
        },
      },
    },
    out: {},
  };

  if (cfg.order) {
    metadata.in.properties.items.items.properties = getItemsProperties(cfg);
  }

  metadata.out = getOut(cfg);

  return metadata;
}

module.exports.process = writeArray;
module.exports.getMetaModel = getMetaModel;
