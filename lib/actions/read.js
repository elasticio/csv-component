/* eslint-disable prefer-template,no-param-reassign,no-shadow */
const _ = require('underscore');
const csv = require('csv');
const { messages } = require('elasticio-node');
const moment = require('moment');
const debug = require('debug');
const request = require('request');
const utils = require('../utils.js');

const attachmentProcessor = require('../utils/attachmentProcessor');

const formatters = {};

// eslint-disable-next-line no-useless-escape
const VARS_REGEX = /{[\w\-]+}/g;

formatters.date = function formatDate(value, col) {
  return moment(value, col.format).toDate();
};

formatters.number = function formatNumber(value, col) {
  if (col.format === 'dec_comma') {
    // 123.456.78,9 => 12345678.9
    value = value.replace(/\./g, '').replace(',', '.');
  }

  if (col.format === 'dec_point') {
    // 1 23,456,78.9 => 12345678.9
    value = value.replace(/,/g, '');
  }

  return parseFloat(value);
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
      body[col.property] = formatValue(row[index], col);
    }
  });

  return messages.newMessageWithBody(body);
}

async function ProcessRead(msg, cfg) {
  let csvURL = cfg.url;
  const username = cfg.username ? cfg.username : null;
  const password = cfg.password ? cfg.password : null;
  const that = this;
  let index = 0;
  const separator = cfg.reader ? cfg.reader.separator || ',' : ',';
  const startRow = cfg.reader ? cfg.reader.startRow || 0 : 0;
  let result = '';

  if (csvURL && csvURL.length > 0) {
    try {
      const result = csvURL.match(VARS_REGEX);
      // eslint-disable-next-line no-unused-vars,array-callback-return
      if (result && result.length) {
        const found = result.find((element) => {
          const token = 'msg.body.' + utils.removeB(element);
          // eslint-disable-next-line no-eval
          csvURL = csvURL.replace(element, eval(token));
        });
      }
      // eslint-disable-next-line no-console
      console.log('URL', csvURL);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Exception happened, ', error);
      that.emit('error', 'Exception happened: ' + error);
      return that.emit('end');
    }
  }
  debug('Incoming message is %j', msg);

  const parser = csv.parse({
    relax_column_count: true,
    delimiter: separator,
  });

  parser.on('readable', () => {
    let record;
    if (cfg.returnAsAttachment) {
      // eslint-disable-next-line no-cond-assign
      while (record = parser.read()) {
        debug('Have got a row #%s', index);
        if (index >= startRow) {
          result += record.toString() + '\n';
        } else {
          debug('Row #%s is skipped based on configuration', index);
        }
        index += 1;
      }
      // eslint-disable-next-line no-else-return
    } else {
      // eslint-disable-next-line no-cond-assign
      while (record = parser.read()) {
        debug('Have got a row #%s', index);
        if (index >= startRow) {
          const msg = createRowMessage(record, cfg.reader.columns);
          that.emit('data', msg);
        } else {
          debug('Row #%s is skipped based on configuration', index);
        }
        index += 1;
      }
    }
  });

  parser.on('finish', async () => {
    debug('Number of lines: ' + index);
    if (cfg.returnAsAttachment) {
      const response = await attachmentProcessor.addAttachment(msg, new Date().getTime() + '.csv',
        result, 'text/csv');
      const output = messages.newMessageWithBody(response);
      output.attachments = response.attachments;
      console.log('Output', output);
      that.emit('data', output);
    }
    that.emit('end');
  });

  parser.on('error', (error) => {
    debug('Error reported by CSV read', error);
    that.emit('error', error);
    that.emit('end');
  });

  debug('Sending GET request to url=%s', csvURL);

  if (username && password) {
    request.get(csvURL).auth(username, password, true)
      .on('response', (response) => {
        debug('Have got response status=%s headers=%j', response.statusCode, response.headers);
        if (response.statusCode !== 200) {
          that.emit('error', 'Unexpected response code code=' + response.statusCode);
          throw Error('Unexpected response code code=' + response.statusCode);
        }
      })
      .pipe(parser);
  } else {
    request.get(csvURL)
      .on('response', (response) => {
        debug('Have got response status=%s headers=%j', response.statusCode, response.headers);
        if (response.statusCode !== 200) {
          that.emit('error', 'Unexpected response code code=' + response.statusCode);
          throw Error('Unexpected response code code=' + response.statusCode);
        }
      })
      .pipe(parser);
  }
}

module.exports.process = ProcessRead;
