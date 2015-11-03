var _ = require('underscore');
var messages = require('../messages.js');
var csvParser = require('csv');

exports.process = function (msg, conf, next) {

    var csv = conf.csv || {};
    var columns = csv.columns || [];

    if (columns.length === 0) {
        return next(null, msg);
    }

    var headers = _.pluck(columns, 'title');
    var body = msg.body || {};
    var fileName = conf.fileName || 'untitled.csv';

    var values = [];

    _.pluck(columns, 'property').forEach(function(prop) {
        values.push(formatValue(body[prop]));
    });

    var headerStr = stringify(headers);
    var rowStr = stringify(values);

    function onAttached() {
        next(null, msg);
    }

    addAttachment(headerStr, rowStr, msg, fileName)
        .then(onAttached)
        .fail(next);
};

function stringify(str) {
    return csvParser().from([]).stringifier.stringify(str);
}

function addAttachment(header, row, msg, fileName) {
    var newRow = '\n' + row;
    return messages.addS3Attachment(msg, fileName, new Buffer(header + newRow, 'utf8'));
}

function formatValue(value) {
    if(_.isNull(value) || _.isUndefined(value)) {
        return '';
    }

    return String(value);
}
