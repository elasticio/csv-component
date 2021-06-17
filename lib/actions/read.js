/* eslint-disable no-restricted-syntax,semi,comma-dangle,class-methods-use-this */

const { AttachmentProcessor } = require('@elastic.io/component-commons-library')
const { Writable } = require('stream');
const { messages } = require('elasticio-node')
const stream = require('stream')
const util = require('util')
const papa = require('papaparse')

const pipeline = util.promisify(stream.pipeline);
const attachmentProcessor = new AttachmentProcessor()

// transform array to obj, for example:
// ['aa', 'bb', 'cc'] => {column0: 'aa', column1: 'bb', column2: 'cc'}
function arrayToObj(arr) {
  let columns = {}
  arr.forEach((value, index) => {
    columns = { ...columns, ...{ [`column${index}`]: value } }
  })
  return columns
}

async function readCSV(msg, cfg) {
  const that = this
  const emitAll = cfg.emitAll === true || cfg.emitAll === 'true'
  const { body } = msg

  // check if url provided in msg
  if (body.url && body.url.length > 0) {
    this.logger.info('URL found')
  } else {
    this.logger.error('URL of the CSV is missing')
    this.emit('error', 'URL of the CSV is missing')
    this.emit('end')
    return
  }

  const parseOptions = {
    header: body.header,
    dynamicTyping: body.dynamicTyping,
    delimiter: body.delimiter
  }

  // if set "Fetch All" create object with results
  const outputMsg = {
    result: [],
  }
  // control of node data stream
  class CsvWriter extends Writable {
    async write(chunk) {
      let data = {}
      if (parseOptions.header) {
        data = chunk
      } else {
        data = arrayToObj(chunk)
      }
      if (emitAll) {
        outputMsg.result.push(data)
      } else {
        await that.emit('data', messages.newMessageWithBody(data))
      }
    }
  }

  let dataStream
  const parseStream = papa.parse(papa.NODE_STREAM_INPUT, parseOptions)
  const writerStream = new CsvWriter()
  writerStream.logger = this.logger

  try {
    dataStream = await attachmentProcessor.getAttachment(body.url, 'stream')
    this.logger.info('File received, trying to parse CSV')
  } catch (err) {
    this.logger.error(`URL - "${body.url}" unreachable: ${err}`);
    this.emit('error', `URL - "${body.url}" unreachable: ${err}`)
    this.emit('end')
    return
  }

  try {
    await pipeline(
      dataStream.data,
      parseStream,
      writerStream
    )
    this.logger.info('File parsed successfully')
  } catch (err) {
    this.logger.error(`error during file parse: ${err}`);
    this.emit('error', `error during file parse: ${err}`)
    this.emit('end')
    return
  }

  if (emitAll) {
    await this.emit('data', messages.newMessageWithBody(outputMsg))
  }
  this.logger.info(`Complete, memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} Mb`)
}

module.exports.process = readCSV
