/* eslint-disable no-param-reassign,no-underscore-dangle */
const { promisify } = require('util');
const request = promisify(require('request'));
const removeTrailingSlash = require('remove-trailing-slash');
const removeLeadingSlash = require('remove-leading-slash');

const NoAuthRestClient = class NoAuthRestClient {
  constructor(emitter, cfg) {
    this.emitter = emitter;
    this.cfg = cfg;
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  _addAuthenticationToRequestOptions(requestOptions) {}

  async makeRequest(options) {
    const {
      url, method, body, headers = {}, urlIsSegment = true, isJson = true,
    } = options;
    const urlToCall = urlIsSegment
      ? `${removeTrailingSlash(this.cfg.resourceServerUrl.trim())}/${removeLeadingSlash(url.trim())}`
      : url.trim();
    console.log(`Making ${method} request to ${urlToCall} ...`);

    const requestOptions = {
      url: urlToCall,
      method,
      json: isJson,
      body,
      headers,
    };

    this._addAuthenticationToRequestOptions(requestOptions);

    const response = await request(requestOptions);

    if (response.statusCode >= 400) {
      throw new Error(`Error in making request to ${urlToCall} Status code: ${response.statusCode}, Body: ${JSON.stringify(response.body)}`);
    }

    return response.body;
  }
};
module.exports.NoAuthRestClient = NoAuthRestClient;

module.exports.BasicAuthRestClient = class BasicAuthRestClient extends NoAuthRestClient {
  constructor(emitter, cfg, username, password) {
    super(emitter, cfg);
    this.username = username;
    this.password = password;
  }

  _addAuthenticationToRequestOptions(requestOptions) {
    requestOptions.auth = {
      username: this.username,
      password: this.password,
    };
  }
};

module.exports.ApiKeyRestClient = class ApiKeyRestClient extends NoAuthRestClient {
  constructor(emitter, cfg, apiKeyHeaderName, apiKeyHeaderValue) {
    super(emitter, cfg);
    this.apiKeyHeaderName = apiKeyHeaderName;
    this.apiKeyHeaderValue = apiKeyHeaderValue;
  }

  _addAuthenticationToRequestOptions(requestOptions) {
    requestOptions.headers[this.apiKeyHeaderName] = this.apiKeyHeaderValue;
  }
};
