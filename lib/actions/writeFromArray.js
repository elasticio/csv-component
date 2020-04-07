const axios = require('axios');
const csv = require('csv');
const _ = require('lodash');
const { messages } = require('elasticio-node');
const client = require('elasticio-rest-node')();
const logger = require('@elastic.io/component-logger')();

const util = require('../util/util');

const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT || 10000; // 10s
const REQUEST_MAX_RETRY = process.env.REQUEST_MAX_RETRY || 7;
const REQUEST_RETRY_DELAY = process.env.REQUEST_RETRY_DELAY || 7000; // 7s
const REQUEST_MAX_CONTENT_LENGTH = process.env.REQUEST_MAX_CONTENT_LENGTH || 10485760; // 10MB
const TIMEOUT_BETWEEN_EVENTS = process.env.TIMEOUT_BETWEEN_EVENTS || 10000; // 10s;

let stringifier;
let signedUrl;
let timeout;
let rowCount = 0;
let ax;
let putUrl;
let options;

let readyFlag = false;

async function init(cfg) {
  let delimiter;
  switch (cfg.separator) {
    case 'comma': {
      delimiter = ',';
      break;
    }
    case 'semicolon': {
      delimiter = ';';
      break;
    }
    case 'space': {
      delimiter = ' ';
      break;
    }
    case 'tab': {
      delimiter = '\t';
      break;
    }
    default: {
      throw Error(`Unexpected separator type: ${cfg.separator}`);
    }
  }
  const header = cfg.includeHeaders !== 'No';
  logger.trace('Using delimiter: \'%s\'', delimiter);
  options = {
    header,
    delimiter,
  };

  stringifier = csv.stringify(options);
  signedUrl = await client.resources.storage.createSignedUrl();
  putUrl = signedUrl.put_url;
  logger.trace('CSV file to be uploaded file to uri=%s', putUrl);
  ax = axios.create();
  util.addRetryCountInterceptorToAxios(ax);
  readyFlag = true;
}
async function ProcessAction(msg) {
  // eslint-disable-next-line consistent-this
  const self = this;

  const columns = Object.keys(msg.body[0]);
  logger.trace('Configured column names:', columns);

  let row = msg.body;
  row = _.pick(row, columns);
  stringifier.write(row);
  _.each(msg.body, (item) => {
    row = _.pick(item, columns);
    stringifier.write(row);
    rowCount += 1;
  });
  self.logger.info('The resulting CSV file contains %s rows', rowCount);
  ax.put(putUrl, stringifier, {
    method: 'PUT',
    timeout: REQUEST_TIMEOUT,
    retry: REQUEST_MAX_RETRY,
    delay: REQUEST_RETRY_DELAY,
    maxContentLength: REQUEST_MAX_CONTENT_LENGTH,
  });
  stringifier.end();

  const messageToEmit = messages.newMessageWithBody({
    rowCount,
  });
  const fileName = `${messageToEmit.id}.csv`;
  messageToEmit.attachments[fileName] = {
    'content-type': 'text/csv',
    url: signedUrl.get_url,
  };
  self.logger.trace('Emitting message %j', messageToEmit);
  await self.emit('data', messageToEmit);
  await self.emit('end');
}

exports.process = ProcessAction;
exports.init = init;