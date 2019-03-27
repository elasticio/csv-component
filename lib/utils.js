module.exports.findAll = function findAll(regex, sourceString, aggregator = []) {
  const arr = regex.exec(sourceString);

  if (arr === null) {
    return aggregator;
  }

  const newString = sourceString.slice(arr.index + arr[0].length);
  return findAll(regex, newString, aggregator.concat([arr]));
};

module.exports.removeB = function removeB(str) {
  return str.replace('{', '').replace('}', '');
};

module.exports.removeTrailingSlash = function removeTrailingSlash(str) {
  return str.replace(/\/$/, '');
};

module.exports.removeLeadingSlash = function removeLeadingSlash(str) {
  return str.replace(/^\/+/, '');
};