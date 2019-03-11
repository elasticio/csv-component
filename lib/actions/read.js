/* eslint-disable prefer-template,no-param-reassign,no-shadow */
const _ = require('underscore');
const csv = require('csv');
const { messages } = require('elasticio-node');
const moment = require('moment');
const debug = require('debug')('csv');
const request = require('request');
const utils = require('../utils.js');

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
      const rowValue = formatValue(row[index], col);

      body[col.property] = rowValue;
    }
  });

  return messages.newMessageWithBody(body);
}

function ProcessRead(msg, cfg) {
  let csvURL = cfg.url;
  const username = cfg.username ? cfg.username : null;
  const password = cfg.password ? cfg.password : null;
  const that = this;
  let index = 0;
  const separator = cfg.reader ? cfg.reader.separator || ',' : ',';
  const startRow = cfg.reader ? cfg.reader.startRow || 0 : 0;
  const { body } = msg;

  console.log('body', body);
  console.log('URL', csvURL);

  if (csvURL && csvURL.length > 0) {
    try {
      const result = csvURL.match(VARS_REGEX);
      console.log('URL placeholders', result);
      // eslint-disable-next-line no-unused-vars,array-callback-return
      const found = result.find((element) => {
        const token = 'body.' + utils.removeB(element);
        // eslint-disable-next-line no-eval
        csvURL = csvURL.replace(element, eval(token));
      });
      console.log(csvURL);
    } catch (error) {
      console.error('Exception happened, ', error);
      that.emit('error', 'Exception happened: ' + error);
      return that.emit('end');
    }
  }

  console.log('Incoming message is %j', msg);
  if (!csvURL || csvURL.length === 0) {
    // Now let's check for the attachment
    if (msg && msg.attachments && Object.keys(msg.attachments).length > 0) {
      const key = Object.keys(msg.attachments)[0];
      console.log('Found attachment key=%s attachment=%j', key, msg.attachments[key]);
      csvURL = msg.attachments[key].url;
    } else {
      console.error('URL of the CSV is missing');
      that.emit('error', 'URL of the CSV is missing');
      return that.emit('end');
    }
  }
  const parser = csv.parse({
    delimiter: separator,
  });

  parser.on('readable', () => {
    let record;
    // eslint-disable-next-line no-cond-assign
    while (record = parser.read()) {
      debug('Have got a row #%s', index);
      if (index >= startRow) {
        // eslint-disable-next-line no-shadow
        const msg = createRowMessage(record, cfg.reader.columns);
        that.emit('data', msg);
      } else {
        debug('Row #%s is skipped based on configuration', index);
      }
      index += 1;
    }
  });

  parser.on('finish', () => {
    debug('Number of lines: ' + index);
    that.emit('end');
  });

  parser.on('error', (error) => {
    debug('Error reported by CSV read', error);
    that.emit('error', error);
    that.emit('end');
  });

  debug('Sending GET request to url=%s', csvURL);
  request.get(csvURL).auth(username, password, true)
    .on('response', (response) => {
      debug('Have got response status=%s headers=%j', response.statusCode, response.headers);
      if (response.statusCode !== 200) {
        that.emit('error', 'Unexpected response code code=' + response.statusCode);
        throw Error('Unexpected response code code=' + response.statusCode);
      }
    })
    .pipe(parser);
}

module.exports.process = ProcessRead;
