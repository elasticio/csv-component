var _ = require('underscore');
var util = require('util');
var csv = require('csv');
var messages = require('../messages.js');
var moment = require('moment');
var s3client = require('s3').getClient(process.env.S3_BUCKET);
var HeartBeatStream = require('../heartbeat-stream.js').HeartBeatStream;

exports.process = function (msg, cfg) {
    var attachments = msg.attachments, that = this;

    if (!attachments || Object.keys(attachments).length == 0) {
        this.info('No attachments found in incoming message, CSV Read component will terminate this flow');
        return this.emit('end');
    }
    var csvs = Object.keys(attachments).filter(function (name) {
        var att = attachments[name];
        var type = att["content-type"];

        if (!att.s3) {
            console.log("Only S3 attachments supported yet");
            return false;
        }

        return true;
    });

    if (csvs.length === 0) {
        this.info('Can not find suitable attachments to parse');
        return this.emit('end');
    }

    this.debug('Will parse following CSV files [%s]', csvs.join(','));

    csvs.forEach(function(name) {
        parseAttachment(that, s3client.getEncrypted(attachments[name].s3), cfg);
    });
};

var parseAttachment = function (that, attachmentPromise, cfg) {

    var separator = cfg.reader.separator || ",";

    var startRow = cfg.reader.startRow || 0;

    attachmentPromise
        .then(function(res) {

            new HeartBeatStream()
                .on('heartbeat', function() {
                    that.emit('heartbeat');
                }).start(res);

            csv().from(res,{ delimiter: separator})
                .on('record', function (row, index) {

                    if (index >= startRow) {

                        var msg = createRowMessage(row, cfg.reader.columns);

                        that.emit('data', msg);
                    }
                })
                .on('end', function (count) {
                    that.debug('Number of lines: ' + count);

                    that.emit('end');
                })
                .on('error', function (error) {
                    console.log(error.stack);
                });
        })
        .fail(function(e) {
            console.log(e);
        })
        .done();
};

var createRowMessage = function (row, columns) {

    var body = {};

    _.each(row, function(value, index) {
        var col = columns[index];

        if (col) {
            var value = formatValue(row[index], col);

            body[col.property] = value;
        }
    });

    return messages.newMessageWithBody(body);
};

var formatValue = function (value, col) {
    var type = col.type || "string";

    var formatter = formatters[type] || function(value, col) {
        return value;
    };

    return formatter(value, col);
};

var formatters = {};

formatters["date"] = function(value, col) {

    return moment(value, col.format).toDate();
};

formatters["number"] = function(value, col) {

    if (col.format === "dec_comma") {
        //123.456.78,9 => 12345678.9
        value = value.replace(/\./g, "").replace(",", ".");
    }

    if (col.format === "dec_point") {
        //123,456,78.9 => 12345678.9
        value = value.replace(/,/g, "")
    }

    return parseFloat(value);
};

