const papa = require('papaparse');

function getItemsProperties(cfg) {
  const properties = {};
  const delimiter = cfg.separator ? cfg.separator : ',';
  // eslint-disable-next-line
  const fields = papa.parse(cfg.order, { delimiter }).data[0].map(x => { return x.trim() });
  fields.forEach((element) => {
    properties[element] = {
      type: 'string',
      required: false,
      title: element,
    };
  });
  return properties;
}

module.exports.getItemsProperties = getItemsProperties;
