const request = require('request-promise');
const co = require('co');
const csv = require('csv');
const _ = require('lodash');
const messages = require('elasticio-node').messages;
const client = require('elasticio-rest-node')();

let stringifier;
let signedUrl;
let timeout;
let rowCount = 0;

exports.init = init;
exports.process = processAction;

function init(cfg) {
    return co(function* gen() {

        const delimiter = cfg.reader.delimiter || ',';
        console.log('Using delimiter: \'%s\'', delimiter);
        const options = {
            header: true,
            delimiter
        };

        if (cfg.reader.columns) {

            const columns = Object.keys(_.keyBy(cfg.reader.columns, 'property'));

            console.log('Configured column names:', columns);
            options.columns = columns;
        }

        stringifier = csv.stringify(options);

        signedUrl = yield client.resources.storage.createSignedUrl();

        let putUrl = signedUrl.put_url;
        console.log('CSV file to be uploaded file to uri=%s', putUrl);

        stringifier.pipe(request.put(putUrl));
    });
}

function processAction(msg, cfg) {
    const self = this;

    const startRow = cfg.reader.startRow || 0;

    if (startRow !== 0 && rowCount === 0) {
        console.log('Skipping the first %s rows', startRow + 1);
    }

    if (timeout) {
        clearTimeout(timeout);
    }

    timeout = setTimeout(()=> {
        console.log('Closing the stream due to inactivity');
        co(function* gen() {
            const finalRowCount = rowCount - startRow;
            console.log('The resulting CSV file contains %s rows', finalRowCount);
            stringifier.end();

            const messageToEmit = messages.newMessageWithBody({
                rowCount: finalRowCount
            });
            const fileName = messageToEmit.id + '.csv';
            messageToEmit.attachments[fileName] = {
                "content-type": "text/csv",
                url: signedUrl.get_url
            };
            signedUrl = null;
            rowCount = 0;

            console.log('Emitting message %j', messageToEmit);
            self.emit('data', messageToEmit);

            yield init(cfg);
        });
    }, 10000);

    if (startRow <= rowCount) {
        let row = msg.body;
        if( cfg.reader.columns) {
            const columns = Object.keys(_.keyBy(cfg.reader.columns, 'property'));
            row = _.pick(msg.body, columns);
        }
        stringifier.write(row);
    }
    rowCount++;
    this.emit('end');
}

/**


co(function* proc() {
    yield init();

    for (let i = 0; i <= 100; i++) {

        processAction({
            body: {
                run: i,
                timestamp: Date.now()
            }
        });
    }

    setTimeout(()=> {

        console.log('Next round');


        for (let i = 100; i <= 200; i++) {

            processAction({
                body: {
                    run: i,
                    timestamp: Date.now()
                }
            });
        }
    }, 10000);
});
 **/
