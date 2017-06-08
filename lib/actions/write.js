const request = require('request-promise');
const co = require('co');
const csv = require('csv');
const messages = require('elasticio-node').messages;
const client = require('elasticio-rest-node')();

let stringifier;
let heartbeatInterval;
let heartbeat = false;
let attachmentUrl;
let rowCount = 0;

exports.init = init;
exports.process = processAction;

function init() {
    return co(function* gen() {
        const signed = yield client.resources.storage.createSignedUrl();

        console.log(signed);

        stringifier = csv.stringify({
            header: true
        });

        let putUrl = signed.put_url;
        console.log('CSV file to be uploaded file to uri=%s', putUrl);

        stringifier
            .pipe(request.put({
                'uri': putUrl
            }));

        heartbeatInterval = setInterval(()=> {
            if (!heartbeat) {
                console.log('Closing the stream due to inactivity');
                clearInterval(heartbeatInterval);
                stringifier.end();
                stringifier = null;
                attachmentUrl = signed.get_url;
            }
            heartbeat = false;
        }, 5000);
    });
}

function processAction(msg) {

    return co(function* gen() {

        heartbeat = true;

        console.log('Writing to stream', msg.body);

        stringifier.write(msg.body);
        rowCount++;

        if (attachmentUrl) {
            const message = messages.newMessageWithBody({
                rowCount
            });
            messages.attachments['foo.csv'] = attachmentUrl;

            return message;
        }
    });
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
});
**/

