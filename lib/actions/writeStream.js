const writeCSV = require('./write');

async function writeStream(msg, cfg) {
  const { body } = msg;
  if (body.items === null || typeof body.items !== 'object' || Array.isArray(body.items)) {
    this.logger.error('Input data must be Object');
    this.emit('error', 'Input data must be Object');
    return;
  }
  await writeCSV.process.call(this, msg, cfg);
}

module.exports.process = writeStream;
