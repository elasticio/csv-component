'use strict';

const _ = require('underscore');
const csv = require('csv');
const messages = require('elasticio-node').messages;
const moment = require('moment');
const debug = require('debug')('csv');
const request = require('request');

const formatters = {};

const VARS_REGEX = /{[\\w\\-]+}/;

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
  let csvURL = cfg.url;
  let username = cfg.username ? cfg.username : null;
  let password = cfg.password ? cfg.password : null;
  const that = this;
  let index = 0;
  const separator = cfg.reader ? cfg.reader.separator || ',' : ',';
  const startRow = cfg.reader ? cfg.reader.startRow || 0 : 0;

  if (csvURL && csvURL.length > 0) {
    try {
      //let result = utils.parseSQL(url);
      let result = VARS_REGEX.exec(csvURL);
      console.log('Parsed URL successfully', result);
      /*
      result.map((param) => {
        console.log('Appending new value to input', param);
        input[param] = {
          type: 'string',
          required: true
        };
      });
      */
    } catch (error) {
      console.error('Exception happened, ', error);
      return cb(error);
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
    request.get(csvURL).auth(username, password, true)
        .on('response', function onResponse(response) {
            debug('Have got response status=%s headers=%j', response.statusCode, response.headers);
            if (response.statusCode !== 200) {
                that.emit('error', 'Unexpected response code code=' + response.statusCode);
                throw Error('Unexpected response code code=' + response.statusCode);
            }
        })
        .pipe(parser);
}

/**
 * This function is called at design time when dynamic metadata need
 * to be fetched from 3rd party system
 *
 * @param cfg - configuration object same as in process method above
 * @param cb - callback returning metadata
 */
/*
function getMetaModel(cfg, cb) {
  console.log('Fetching metadata with following configuration cfg=%j', cfg);
  // Here we return metadata in the same format as
  // it is configured in component.json
  let url = cfg.url;
  let input = {}, output = {};
  console.log('Going to parse url=', url);
  if (url && url.length > 0) {
    try {
      //let result = utils.parseSQL(url);
      let result = VARS_REGEX.exec(url);
      console.log('Parsed URL successfully', result);
      result.map((param) => {
        console.log('Appending new value to input', param);
        input[param] = {
          type: 'string',
          required: true
        };
      });
    } catch (error) {
      console.error('Exception happened, ', error);
      return cb(error);
    }
  }
  cb(null, {
    in: {
      type: "object",
      properties: input
    },
    out: {
      type: "object",
      properties: {}
    }
  });
}
*/
module.exports.process = ProcessRead;
//module.exports.getMetaModel = getMetaModel;
