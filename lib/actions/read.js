'use strict';

const _ = require('underscore');
const csv = require('csv');
const messages = require('elasticio-node').messages;
const moment = require('moment');
const debug = require('debug')('csv');
const request = require('request');

const formatters = {};

formatters.date = function formatDate(value, col) {

    return moment(value, col.format).toDate();
};

formatters.number = function formatNumber(value, col) {

    if (col.format === 'dec_comma') {
        //123.456.78,9 => 12345678.9
        value = value.replace(/\./g, '').replace(',', '.');
    }

    if (col.format === 'dec_point') {
        //123,456,78.9 => 12345678.9
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

    _.each(row, function createRowMessageForRow(value, index) {
        const col = columns[index];

        if (col) {
            const rowValue = formatValue(row[index], col);

            body[col.property] = rowValue;
        }
    });

    return messages.newMessageWithBody(body);
}

function ProcessRead(msg, cfg) {
    const config = cfg;
    let csvURL = cfg.url;
    const that = this;
    let index = 0;
    const separator = cfg.reader ? cfg.reader.separator || ',' : ',';
    const startRow = cfg.reader ? cfg.reader.startRow || 0 : 0;
/*
  if (!csvURL) {
    throw new Error('URL is required');
  }

  const url = jsonata(config.url.url).evaluate(msg.body);
  const method = config.method;
  const headers = config.headers;
  const body = config.body || {};
  const followRedirect = cfg.followRedirect !== "doNotFollowRedirects";
  const auth = cfg.url.auth;

  if (!method) {
    throw new Error('Method is required');
  }

  const formattedMethod = methodsMap[method];

  if (!formattedMethod) {
    throw new Error(
      `Method "${method}" isn't one of the: ${Object.keys(methodsMap)}.`
    );
  }
*/
  /*
 if cfg.followRedirect has value doNotFollowRedirects
 or cfg.followRedirect is not exists
 followRedirect option should be true
 */
  /*
  const requestOptions = {
    method: formattedMethod,
    uri: url,
    followRedirect: true,
    followAllRedirects: true,
    gzip: true,
    resolveWithFullResponse: true,
    simple: false,
    encoding: null
  };

  const existingAuthHeader = (headers || []).find(header => {
    return header._type === CREDS_HEADER_TYPE;
  });

  switch (auth.type) {
    case authTypes.BASIC:
      if (existingAuthHeader) {
        existingAuthHeader.key = '';
      }

      headers.push({
        key: 'Authorization',
        value: `"Basic ${new Buffer(`${auth.basic.username}:${auth.basic.password}`).toString('base64')}"`
      });

      break;

    case authTypes.API_KEY:
      if (existingAuthHeader) {
        existingAuthHeader.key = '';
      }

      headers.push({
        key: auth.apiKey.headerName,
        value: `"${auth.apiKey.headerValue}"`
      });

      break;

    default:
      if (existingAuthHeader) {
        existingAuthHeader.key = '';
      }
  }

  if (headers && headers.length) {
    requestOptions.headers = headers.reduce(
      (headers, header) => {
        if (!header.key || !header.value) {
          return headers;
        }
        headers[header.key.toLowerCase()]=jsonata(header.value).evaluate(msg.body);
        return headers;
      }, requestOptions.headers || {})
  }

  debug('Request options: %o', JSON.stringify(requestOptions));
*/
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
        delimiter: separator
    });

    parser.on('readable', function onReadable() {
        let record;
        // eslint-disable-next-line no-cond-assign
        while (record = parser.read()) {
            debug('Have got a row #%s', index);
            if (index >= startRow) {
                const msg = createRowMessage(record, cfg.reader.columns);
                that.emit('data', msg);
            } else {
                debug('Row #%s is skipped based on configuration', index);
            }
            index++;
        }
    });

    parser.on('finish', function fireEnd() {
        debug('Number of lines: ' + index);
        that.emit('end');
    });

    parser.on('error', function emitError(error) {
        debug('Error reported by CSV read', error);
        that.emit('error', error);
        that.emit('end');
    });

    debug('Sending GET request to url=%s', csvURL);
    request.get(csvURL)
        .on('response', function onResponse(response) {
            debug('Have got response status=%s headers=%j', response.statusCode, response.headers);
            if (response.statusCode !== 200) {
                that.emit('error', 'Unexpected response code code=' + response.statusCode);
                throw Error('Unexpected response code code=' + response.statusCode);
            }
        })
        .pipe(parser);
}

exports.process = ProcessRead;
