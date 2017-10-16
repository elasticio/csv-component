'use strict';

const request = require('request-promise');
const co = require('co');
const csv = require('csv');
const _ = require('lodash');
const messages = require('elasticio-node').messages;
const client = require('elasticio-rest-node')();

const TIMEOUT_BETWEEN_EVENTS = 10000;

let stringifier;
let signedUrl;
let timeout;
let rowCount = 0;

exports.init = function init(cfg) {
    return co(function* gen() {

        const delimiter = cfg.writer.delimiter || ',';
        console.log('Using delimiter: \'%s\'', delimiter);
        const options = {
            header: true,
            delimiter
        };

        if (cfg.writer.columns) {

            const columns = Object.keys(_.keyBy(cfg.writer.columns, 'property'));

            console.log('Configured column names:', columns);
            options.columns = columns;
        }

        stringifier = csv.stringify(options);

        signedUrl = yield client.resources.storage.createSignedUrl();

        let putUrl = signedUrl.put_url;
        console.log('CSV file to be uploaded file to uri=%s', putUrl);

        stringifier.pipe(request.put(putUrl));
    });
};

exports.process = function ProcessAction(msg, cfg) {
    // eslint-disable-next-line consistent-this
    const self = this;

    if (timeout) {
        clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
        console.log('Closing the stream due to inactivity');
        co(function* gen() {
            const finalRowCount = rowCount;
            console.log('The resulting CSV file contains %s rows', finalRowCount);
            stringifier.end();

            const messageToEmit = messages.newMessageWithBody({
                rowCount: finalRowCount
            });
            const fileName = messageToEmit.id + '.csv';
            messageToEmit.attachments[fileName] = {
                'content-type': 'text/csv',
                'url': signedUrl.get_url
            };
            signedUrl = null;
            rowCount = 0;

            console.log('Emitting message %j', messageToEmit);
            self.emit('data', messageToEmit);

            yield exports.init(cfg);
        });
    }, TIMEOUT_BETWEEN_EVENTS);

    let row = msg.body;
    console.log(`Incoming data: ${JSON.stringify(row)}`);
    if (cfg.writer.columns) {
        const columns = Object.keys(_.keyBy(cfg.writer.columns, 'property'));
        row = _.pick(msg.body, columns);
    }
    stringifier.write(row);
    rowCount++;
    this.emit('end');
};
