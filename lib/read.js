'use strict';

const _ = require('underscore');
const csv = require('csv');
const messages = require('elasticio-node').messages;
const moment = require('moment');
const debug = require('debug')('csv');
const request = require('request');
const { Writable } = require('stream');

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

async function ProcessRead(msg, cfg) {
    let csvURL = cfg.url;
    const that = this;
    let index = 0;
    const separator = cfg.reader ? cfg.reader.separator || ',' : ',';
    const startRow = cfg.reader ? cfg.reader.startRow || 0 : 0;

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
            return await that.emit('end');
        }
    }
    const parser = csv.parse({
        delimiter: separator
    });

    let ended = false;

    class CsvWriter extends Writable {
        async write(chunk, encoding, callback) {
            parser.pause();
            debug('Processing %d row...', index);
            debug('Memory usage: %d Mb', process.memoryUsage().heapUsed / 1024 / 1024);

            if (index >= startRow) {
                const msg = createRowMessage(chunk, cfg.reader.columns);
                await that.emit('data', msg);
            } else {
                debug('Row #%s is skipped based on configuration', index);
            }
            index++;
            parser.resume();
        }

        async end(chunk, encoding, callback) {
            debug('Processing csv writer end event...');
            debug('Memory usage: %d Mb', process.memoryUsage().heapUsed / 1024 / 1024);

            debug('Number of lines: ' + index);
            await that.emit('end');
            ended = true;
        }
    }

    const writer = new CsvWriter();

    debug('Sending GET request to url=%s', csvURL);
    request.get(csvURL)
        .on('response', async function onResponse(response) {
            debug('Have got response status=%s headers=%j', response.statusCode, response.headers);
            if (response.statusCode !== 200) {
                await that.emit('error', 'Unexpected response code code=' + response.statusCode);
                ended = true;
                throw Error('Unexpected response code code=' + response.statusCode);
            }
        })
        .pipe(parser).pipe(writer);

    // Need to wait for processing all messages
    while (!ended) {
        await new Promise((resolve, reject) => {
            setTimeout(() => { resolve(); }, 0);
        });
    }
}

exports.process = ProcessRead;
