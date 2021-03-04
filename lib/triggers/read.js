/* eslint-disable no-unused-vars,no-param-reassign,class-methods-use-this,no-shadow */

const _ = require('underscore');
const csv = require('csv');
const { messages } = require('elasticio-node');
const moment = require('moment');
const axios = require('axios');
const { Writable } = require('stream');
const util = require('../util/util');

const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT || 10000; // ms
const REQUEST_MAX_RETRY = process.env.REQUEST_MAX_RETRY || 7;
const REQUEST_RETRY_DELAY = process.env.REQUEST_RETRY_DELAY || 7000; // ms
const formatters = {
  date: (value, col) => moment(value, col.format).toDate(),
  number: (value, col) => {
    if (col.format === 'dec_comma') {
      // 123.456.78,9 => 12345678.9
      value = value.replace(/\./g, '').replace(',', '.');
    }

    if (col.format === 'dec_point') {
      // 123,456,78.9 => 12345678.9
      value = value.replace(/,/g, '');
    }

    return parseFloat(value);
  },
};

function formatValue(value, col) {
  const type = col.type || 'string';

  // eslint-disable-next-line no-unused-vars
  const formatter = formatters[type] || function formatNoop(value, col) {
    return value;
  };

  return formatter(value, col);
}

function createRowMessage(row, columns) {
  const body = {};

  _.each(row, (value, index) => {
    const col = columns[index];

    if (col) {
      const rowValue = formatValue(row[index], col);

      body[col.property] = rowValue;
    }
  });

  return messages.newMessageWithBody(body);
}

async function ProcessRead(msg, cfg) {
  let csvURL = cfg.url;
  const that = this;
  let index = 0;
  const separator = cfg.reader ? cfg.reader.separator || ',' : ',';
  const startRow = cfg.reader ? cfg.reader.startRow || 0 : 0;
  if (!csvURL || csvURL.length === 0) {
    // Now let's check for the attachment
    if (msg && msg.attachments && Object.keys(msg.attachments).length > 0) {
      const key = Object.keys(msg.attachments)[0];
      that.logger.trace('Attachment found');
      csvURL = msg.attachments[key].url;
    } else {
      that.logger.error('URL of the CSV is missing');
      that.emit('error', 'URL of the CSV is missing');
      that.emit('end');
      return;
    }
  }
  const parser = csv.parse({
    delimiter: separator,
  });

  let ended = false;

  const outputMsg = {
    result: [],
  };

  class CsvWriter extends Writable {
    async write(chunk, encoding, callback) {
      parser.pause();
      this.logger.debug('Processing %d row...', index);
      this.logger.debug('Memory usage: %d Mb', process.memoryUsage().heapUsed / 1024 / 1024);
      if (index >= startRow) {
        const msg = createRowMessage(chunk, cfg.reader.columns);
        if (cfg.emitAll) {
          this.logger.debug('Row #%s added to result array', index);
          outputMsg.result.push(msg.body);
        } else {
          await that.emit('data', msg);
        }
      } else {
        this.logger.debug('Row #%s is skipped based on configuration', index);
      }
      index += 1;
      parser.resume();
    }

    async end(chunk, encoding, callback) {
      if (cfg.emitAll) {
        await that.emit('data', messages.newMessageWithBody(outputMsg));
      }
      this.logger.debug('Processing csv writer end event...');
      this.logger.debug('Memory usage: %d Mb', process.memoryUsage().heapUsed / 1024 / 1024);

      this.logger.debug(`Number of lines: ${index}`);
      await that.emit('end');
      ended = true;
    }
  }

  const writer = new CsvWriter();
  writer.logger = that.logger;

  that.logger.debug('Sending GET request to csv url');
  const ax = axios.create();
  util.addRetryCountInterceptorToAxios(ax);
  const response = await ax({
    method: 'get',
    url: csvURL,
    responseType: 'stream',
    timeout: REQUEST_TIMEOUT,
    retry: REQUEST_MAX_RETRY,
    delay: REQUEST_RETRY_DELAY,
  });
  that.logger.debug('Have got response status=%s', response.status);
  if (response.status !== 200) {
    await that.emit('error', `Unexpected response code code=${response.status}`);
    ended = true;
    throw Error(`Unexpected response code code=${response.status}`);
  }
  response.data.pipe(parser).pipe(writer);

  // Need to wait for processing all messages
  while (!ended) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve, reject) => {
      setTimeout(() => { resolve(); }, 0);
    });
  }
}

exports.process = ProcessRead;
