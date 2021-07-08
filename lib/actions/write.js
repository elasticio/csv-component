/* eslint-disable no-restricted-syntax,semi,comma-dangle,class-methods-use-this,
no-param-reassign */

const { AttachmentProcessor } = require('@elastic.io/component-commons-library')
const { messages } = require('elasticio-node')
const papa = require('papaparse')

const TIMEOUT_BETWEEN_EVENTS = process.env.TIMEOUT_BETWEEN_EVENTS || 10000; // 10s;

const rawData = []
let timeout

async function proceedData(data, cfg) {
  let csvString
  const delimiter = cfg.separator ? cfg.separator : ','

  const unparseOptions = {
    header: cfg.header,
    delimiter
  }

  if (cfg.order) {
    // create fields array from string
    // eslint-disable-next-line
    const fields = papa.parse(cfg.order, { delimiter }).data[0].map(x => { return x.trim() })
    const orderedData = data.map((value) => {
      const result = fields.map((key) => {
        const filtered = value[key]
        return filtered
      })
      return result
    })
    csvString = papa.unparse({
      fields,
      data: orderedData
    }, unparseOptions)
  } else {
    csvString = papa.unparse(data, unparseOptions)
  }

  if (!cfg.uploadToAttachment) {
    await this.emit('data', messages.newMessageWithBody({ csvString }))
    this.logger.info(`Complete, memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} Mb`)
    return
  }

  const attachmentProcessor = new AttachmentProcessor()
  let attachment
  try {
    attachment = await attachmentProcessor.uploadAttachment(csvString)
  } catch (err) {
    this.logger.error(`Upload attachment failed: ${err}`)
    this.emit('error', `Upload attachment failed: ${err}`)
  }
  const body = {
    attachmentUrl: attachment.config.url,
    type: '.csv',
    size: Buffer.byteLength(csvString),
    attachmentCreationTime: new Date(),
    contentType: 'text/csv'
  }
  const respData = messages.newMessageWithBody(body)

  respData.attachments = {
    'data.csv': {
      'content-type': body.contentType,
      size: body.size,
      url: body.attachmentUrl
    }
  }

  await this.emit('data', respData)
  this.logger.info(`Complete, memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} Mb`)
  this.logger.info('Attachment created successfully')
}

async function writeCSV(msg, cfg) {
  const { body } = msg

  if (body.header !== undefined
    && body.header !== ''
    && (typeof body.header) !== 'boolean') {
    this.logger.error('Non-boolean values are not supported by "Include Headers" field')
    this.emit('error', 'Non-boolean values are not supported by "Include Headers" field')
    return
  }

  cfg.header = body.header

  // if not array - create array from all fn calls and send data to proceedData
  if (Array.isArray(body.items)) {
    this.logger.info('input metadata is array. Proceed with data ')
    await proceedData.call(this, body.items, cfg)
  } else {
    rawData.push(body.items)
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      this.logger.info(`input metadata is object. Array creation (wait up to ${TIMEOUT_BETWEEN_EVENTS}ms for more records)`)
      proceedData.call(this, rawData, cfg)
    }, TIMEOUT_BETWEEN_EVENTS)
  }
}

module.exports.process = writeCSV
