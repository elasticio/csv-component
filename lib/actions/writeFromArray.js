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

let stringifier;
let signedUrl;
let rowCount = 0;
let ax;
let putUrl;
let options;

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
  logger.trace('Uploading CSV file');
  ax = axios.create();
  util.addRetryCountInterceptorToAxios(ax);
}

async function ProcessAction(msg) {
  // eslint-disable-next-line consistent-this
  const self = this;
  const { inputArray } = msg.body;
  let isError = false;
  let errorValue = '';

  const columns = Object.keys(inputArray[0]);
  rowCount = inputArray.length;
  let row = {};

  await _.each(inputArray, async (item) => {
    const entries = Object.values(inputArray);
    // eslint-disable-next-line no-restricted-syntax
    for (const entry of entries) {
      if (isError) {
        break;
      }
      const values = Object.values(entry);
      // eslint-disable-next-line no-restricted-syntax
      for (const value of values) {
        if (value !== null && value !== undefined && (typeof value === 'object' || Array.isArray(value))) {
          isError = true;
          errorValue = value;
          break;
        }
      }
    }
    row = _.pick(item, columns);
    await stringifier.write(row);
  });
  self.logger.info('The resulting CSV file contains %s rows', rowCount);

  if (isError) {
    throw Error(`Inbound message should be a plain Object. At least one of entries is not a primitive type: ${JSON.stringify(errorValue)}`);
  }

  await stringifier.end();

  await ax.put(putUrl, stringifier, {
    method: 'PUT',
    timeout: REQUEST_TIMEOUT,
    retry: REQUEST_MAX_RETRY,
    delay: REQUEST_RETRY_DELAY,
    maxContentLength: REQUEST_MAX_CONTENT_LENGTH,
  });

  const messageToEmit = messages.newMessageWithBody({
    rowCount,
    url: signedUrl.get_url,
  });
  const fileName = `${messageToEmit.id}.csv`;
  messageToEmit.attachments[fileName] = {
    'content-type': 'text/csv',
    url: signedUrl.get_url,
  };
  self.logger.trace('Emitting message');
  await self.emit('data', messageToEmit);
  await self.emit('end');
}

exports.process = ProcessAction;
exports.init = init;
