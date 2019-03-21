/* eslint-disable no-use-before-define,no-param-reassign */
const debug = require('debug')('attachment');
const request = require('request');
const { Readable } = require('stream');
const { BasicAuthRestClient } = require('../StatelessBasicAuthRestClient');

exports.addAttachment = addAttachment;

function addAttachment(msg, name, body, contentType) {
  return getUrlsManualy().then((result) => {
    debug('createSignedUrl result: %j', result);
    debug('Uploading to url: %s', result.put_url);
    debug('Content-Type: %s', contentType);
    console.log('uploadFile is about to execute');
    return uploadFile(result, contentType);
  });

  async function getUrlsManualy() {
    const attachmentClient = new BasicAuthRestClient(this, {
      resourceServerUrl: 'http://api-service.platform.svc.cluster.local.:9000',
    }, process.env.ELASTICIO_API_USERNAME, process.env.ELASTICIO_API_KEY);

    return attachmentClient.makeRequest({
      method: 'POST',
      url: '/v2/resources/storage/signed-url',
    });
  }

  async function uploadFile(urls) {
    debug('Trying to upload file: %j', body);

    const stream = new Readable();
    stream.push(body.toString());
    stream.push(null);
    await stream.pipe(request.put(urls.put_url));

    const msgLength = body.length;

    msg.attachments = {};
    msg.attachments[name] = {
      url: urls.get_url,
      size: msgLength,
      'content-type': contentType,
    };
    console.log(msg);
    return msg;
  }
}
