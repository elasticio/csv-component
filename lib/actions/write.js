'use strict';

const axios = require('axios');
const co = require('co');
const csv = require('csv');
const _ = require('lodash');
const messages = require('elasticio-node').messages;
const client = require('elasticio-rest-node')();

const util = require('../util/util');

const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT || 40000; //ms
const REQUEST_MAX_RETRY = process.env.REQUEST_MAX_RETRY || 3;
const REQUEST_RETRY_DELAY = process.env.REQUEST_RETRY_DELAY || 5000; // ms
const REQUEST_MAX_CONTENT_LENGTH = process.env.REQUEST_MAX_CONTENT_LENGTH || 1048576; // 100MB
const TIMEOUT_BETWEEN_EVENTS = 60000;

let stringifier;
let signedUrl;
let timeout;
let rowCount = 0;
let ax;
exports.init = async function init(cfg) {
    return co(function* gen() {

        const delimiter = cfg.writer.separator || ',';
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
        const ax = axios.create();
        util.addRetryCountInterceptorToAxios(ax);
    });
};

exports.process = async function ProcessAction(msg, cfg) {
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
            yield self.emit('data', messageToEmit);

            yield exports.init(cfg);
        });
    }, TIMEOUT_BETWEEN_EVENTS);
    let putUrl = signedUrl.put_url;
    console.log('CSV file to be uploaded file to uri=%s', putUrl);

    let row = msg.body.writer;
    console.log(`Incoming data: ${JSON.stringify(row)}`);
    if (cfg.writer.columns) {
        const columns = Object.keys(_.keyBy(cfg.writer.columns, 'property'));
        row = _.pick(row, columns);
    }
    console.log(`Writing Row: ${JSON.stringify(row)}`);
    stringifier.write(row);
    rowCount++;
    await ax({
        method: 'PUT',
        url: putUrl,
        data: stringifier,
        timeout: REQUEST_TIMEOUT,
        retry: REQUEST_MAX_RETRY,
        delay: REQUEST_RETRY_DELAY,
        maxContentLength: REQUEST_MAX_CONTENT_LENGTH
    });
    await this.emit('end');
};
