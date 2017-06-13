const request = require('request-promise');
const co = require('co');
const csv = require('csv');
const messages = require('elasticio-node').messages;
const client = require('elasticio-rest-node')();

let stringifier;
let signedUrl;
let timeout;
let rowCount = 0;

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

        stringifier.pipe(request.put(putUrl));
    });
}

function processAction(msg) {
    const self = this;

    if (timeout) {
        clearTimeout(timeout);
    }

    timeout = setTimeout(()=> {
        console.log('Closing the stream due to inactivity');
        co(function* gen() {
            console.log('The resulting CSV file contains %s rows', rowCount);
            stringifier.end();

            const messageToEmit = messages.newMessageWithBody({
                rowCount
            });
            const fileName = messageToEmit.id + '.csv';
            messageToEmit.attachments[fileName] = {
                "content-type": "text/csv",
                url: signedUrl.get_url
            };
            console.log('%j', messageToEmit);
            signedUrl = null;
            rowCount = 0;

            console.log('Emitting message');
            self.emit('data', messageToEmit);

            yield init();
        });
    }, 5000);

    console.log('Writing to stream', msg.body);

    stringifier.write(msg.body);
    rowCount++;
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
