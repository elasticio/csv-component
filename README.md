[![CircleCI](https://circleci.com/gh/elasticio/csv-component.svg?style=svg)](https://circleci.com/gh/elasticio/csv-component)
# CSV Component

## Description

A component to read and write Comma Separated Values (CSV) files.

## How works

The component can read the CSV file from a remote URL or from the message
attachment. It can also write a CSV file from the incoming events.

## Requirements

## Environment variables
Name|Mandatory|Description|Values|
|----|---------|-----------|------|
|EIO_REQUIRED_RAM_MB| false | Value of allocated memory to component | Recommended: `512`/`1024` |
|REQUEST_TIMEOUT| false |  HTTP request timeout in milliseconds | Default value: `10000` |
|REQUEST_RETRY_DELAY| false | Delay between retry attempts in milliseconds | Default value: `7000` |
|REQUEST_MAX_RETRY| false | Number of HTTP request retry attempts |  Default value: `7` |
|REQUEST_MAX_CONTENT_LENGTH| false | Max size of http request in bytes | Default value: `10485760` |
|TIMEOUT_BETWEEN_EVENTS| false | Number of milliseconds write action wait before creating separate attachments | Default value: `10000` |


## Credentials

The component does not require credentials to function.

## Actions

### Read CSV attachment

This action will read the CSV attachment of the incoming message or from the specified URL and output a JSON object.
To configure this action the following fields can be used:

#### Config Fields

*   `Emit Behavior` - this selector configures output behavior of the component. If the option is `Fetch All` - the component emits an array of messages, otherwise (`Emit Individually`) - the component emits a message per row.

#### Input Metadata

*   `URL` - We will fetch this URL and parse it as CSV file
*   `Contains headers` - if true, the first row of parsed data will be interpreted as field names.
*   `Delimiter` - The delimiting character. Leave blank to auto-detect from a list of most common delimiters.
*   `Convert Data types` - numeric, date and boolean data will be converted to their type instead of remaining strings.

### Write CSV attachment

* `Include Header` - this select configures output behavior of the component. If option is `Yes` or no value chosen than header of csv file will be written to attachment, this is default behavior. If value `No` selected than csv header will be omitted from attachment.

This action will combine multiple incoming events into a CSV file until there is a gap
of more than 10 seconds between events. Afterwards, the CSV file will be closed
and attached to the outgoing message.

As part of the component setup, one must specify the columns of the CSV file.
These columns will be published as the header in the first row. For each incoming
event, the value for each header will be `stringified` and written as the value
for that cell. All other properties will be ignored. For example, headers
`foo,bar` along with the following JSON events:

```
{"foo":"myfoo", "bar":"mybar"}
{"foo":"myfoo", "bar":[1,2]}
{"bar":"mybar", "baz":"mybaz"}
```

will produce the following `.csv` file:

```
foo,bar
myfoo,mybar
myfoo,"[1,2]"
,mybar
```

When columns are added in the UI, you will be presented with an opportunity to
provide a JSONata expression per column. If you require number formatting that
is specific to a locale, the JSONata expression should handle that concern.

The output of the CSV Write component will be a message with an attachment.  In
order to access this attachment, the component following the CSV Write must be
able to handle file attachments.

### Write CSV attachment from JSON Object

* `Include Header` - this select configures output behavior of the component. If option is `Yes` or no value chosen than header of csv file will be written to attachment, this is default behavior. If value `No` selected than csv header will be omitted from attachment.
* `Separator` - this select configures type of CSV delimiter in an output file. There are next options: `Comma (,)`, `Semicolon (;)`, `Space ( )`, `Tab (\t)`, `Pipe (¦)`.

This action will combine multiple incoming events into a CSV file until there is a gap
of more than 10 seconds between events. Afterwards, the CSV file will be closed
and attached to the outgoing message.

This action will convert an incoming array into a CSV file by following approach:

* Header inherits names of keys from the input message;
* Payload will store data from Values of relevant Keys (Columns);
* Undefined values of a JSON Object won't be joined to result set (`{ key: undefined }`);
* False values of a JSON Object will be represented as empty string (`{ key: false }` => `""`).

Requirements:

* The inbound message is an JSON Object, wrapped by 'inputObject' object;
* This JSON object has plain structure without nested levels (structured types `objects` and `arrays` are not supported as values). Only primitive types are supported: `strings`, `numbers`, `booleans` and `null`. Otherwise, the error message will be thrown: `Inbound message should be a plain Object. At least one of entries is not a primitive type`.

The keys of an input JSON will be published as the header in the first row. For each incoming
event, the value for each header will be `stringified` and written as the value
for that cell. All other properties will be ignored. For example, headers
`foo,bar` along with the following JSON events:

```
{"inputObject": {"foo":"myfoo", "bar":"mybar"}}
{"inputObject": {"foo":"myfoo", "bar":[1,2]}}
{"inputObject": {"bar":"mybar", "baz":"mybaz"}}
```

will produce the following `.csv` file:

```
foo,bar
myfoo,mybar
myfoo,"[1,2]"
,mybar
```

The output of the CSV Write component will be a message with an attachment.  In
order to access this attachment, the component following the CSV Write must be
able to handle file attachments.

### Write CSV attachment from JSON Array

* `Include Header` - this select configures output behavior of the component. If option is `Yes` or no value chosen than header of csv file will be written to attachment, this is default behavior. If value `No` selected than csv header will be omitted from attachment.
* `Separator` - this select configures type of CSV delimiter in an output file. There are next options: `Comma (,)`, `Semicolon (;)`, `Space ( )`, `Tab (\t)`, `Pipe (¦)`.

This action will convert an incoming array into a CSV file by following approach:

* Header inherits names of keys from the input message;
* Payload will store data from Values of relevant Keys (Columns);
* Undefined values of a JSON Object won't be joined to result set (`{ key: undefined }`);
* False values of a JSON Object will be represented as empty string (`{ key: false }` => `""`).

Requirements:

* The inbound message is an JSON Array of Objects with identical structure, wrapped by 'inputArray' object;
* Each JSON object for a message has plain structure without nested levels (structured types `objects` and `arrays` are not supported as values). Only primitive types are supported: `strings`, `numbers`, `booleans` and `null`. Otherwise, the error message will be thrown: `Inbound message should be a plain Object. At least one of entries is not a primitive type`.

The keys of an input JSON will be published as the header in the first row. For each incoming
event, the value for each header will be `stringified` and written as the value
for that cell. All other properties will be ignored. For example, headers
`foo,bar` along with the following JSON events:

```
{
    "inputArray": [
        {"foo":"myfoo", "bar":"mybar"}
        {"foo":"myfoo", "bar":[1,2]}
        {"bar":"mybar", "baz":"mybaz"}
    ]
}
```

will produce the following `.csv` file:

```
foo,bar
myfoo,mybar
myfoo2,[1,2]"
,mybar
```

The output of the CSV Write component will be a message with an attachment. There will be one CSV file generated per incoming message.  In
order to access this attachment, the component following the CSV Write must be
able to handle file attachments.

### Limitations

#### General

1. You may get `Component run out of memory and terminated.` error during run-time, that means that component needs more memory, please add
 `EIO_REQUIRED_RAM_MB` environment variable with an appropriate value (e.g. value `1024` means that 1024 MB will be allocated) for the component in this case.
2. You may get `Error: write after end` error, as a current workaround try increase value of environment variable: `TIMEOUT_BETWEEN_EVENTS`. 
3. Maximal possible size for an attachment is 10 MB.
4. Attachments mechanism does not work with [Local Agent Installation](https://docs.elastic.io/getting-started/local-agent.html)