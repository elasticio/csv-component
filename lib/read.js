var _ = require('underscore');
var util = require('util');
var csv = require('csv');
var messages = require('elasticio-node').messages;
var moment = require('moment');
var debug = require('debug')('csv');
var request = require('request');

function processRead(msg, cfg) {
    var csvURL = cfg.url;
    var that = this;
    var index = 0;
    var separator = cfg.reader ? cfg.reader.separator || "," : ",";
    var startRow = cfg.reader ? cfg.reader.startRow || 0 : 0;


    console.log('Incoming message is %j', msg);
    if (!csvURL || csvURL.length == 0) {
        // Now let's check for the attachment
        if (msg && msg.attachments && Object.keys(msg.attachments).length > 0) {
            var key = Object.keys(msg.attachments)[0];
            console.log('Found attachment key=%s attachment=%j', key, msg.attachments[key]);
            csvURL = msg.attachments[key].url;
        } else {
            console.error('URL of the CSV is missing');
            that.emit('error', 'URL of the CSV is missing');
            return that.emit('end');
        }
    }
    var parser = csv.parse({delimiter: separator});

    parser.on('readable', function() {
        while(record = parser.read()){
            debug('Have got a row #%s', index);
            if (index >= startRow) {
                var msg = createRowMessage(record, cfg.reader.columns);
                that.emit('data', msg);
            } else {
                debug('Row #%s is skipped based on configuration', index);
            }
            index++;
        }
    });

    parser.on('finish', function fireEnd() {
        debug('Number of lines: ' + index);
        that.emit('end');
    });

    parser.on('error', function emitError(error) {
        debug('Error reported by CSV read', error);
        that.emit('error', error);
        that.emit('end');
    });

    debug('Sending GET request to url=%s', csvURL);
    request.get(csvURL)
        .on('response', function (response) {
            debug('Have got response status=%s headers=%j', response.statusCode, response.headers);
            if (response.statusCode != 200) {
                that.emit('error', 'Unexpected response code code=' + response.statusCode);
                throw Error('Unexpected response code code=' + response.statusCode);
            }
        })
        .pipe(parser);
}

var createRowMessage = function (row, columns) {

    var body = {};

    _.each(row, function (value, index) {
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

    var formatter = formatters[type] || function (value, col) {
            return value;
        };

    return formatter(value, col);
};

var formatters = {};

formatters["date"] = function (value, col) {

    return moment(value, col.format).toDate();
};

formatters["number"] = function (value, col) {

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

exports.process = processRead;