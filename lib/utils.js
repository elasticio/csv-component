'use strict';

module.exports.findAll = function findAll(regex, sourceString, aggregator = []) {
    const arr = regex.exec(sourceString);

    if (arr === null) {return aggregator;}

    const newString = sourceString.slice(arr.index + arr[0].length);
    return findAll(regex, newString, aggregator.concat([arr]));
};
