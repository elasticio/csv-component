const writeCSV = require('./write');

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

module.exports.process = writeArray;
