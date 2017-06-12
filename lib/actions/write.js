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
let messageToEmit;

exports.init = init;
exports.process = processAction;

function init() {
    return co(function* gen() {

        stringifier = csv.stringify({
            header: true
        });

        signedUrl = yield client.resources.storage.createSignedUrl();

        console.log(signedUrl);

        let putUrl = signedUrl.put_url;
        console.log('CSV file to be uploaded file to uri=%s', putUrl);

        stringifier
            .pipe(request.put({
                'uri': putUrl
            }));
    });
}

function processAction(msg) {

    if (timeout) {
        clearTimeout(timeout);
    }

    timeout = setTimeout(()=> {
        console.log('Closing the stream due to inactivity');
        co(function* gen() {
            stringifier.end();
            signedUrl = null;
            messageToEmit = messages.newMessageWithBody({
                rowCount
            });
            rowCount = 0;
            yield init();
        });
    }, 5000);

    console.log('Writing to stream', msg.body);

    stringifier.write(msg.body);
    rowCount++;

    if (messageToEmit) {
        const foo = _.cloneDeep(messageToEmit);
        messageToEmit = null;
        return foo;
    }
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
