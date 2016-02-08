# CSV component for elastic.io platform

A comma-separated values ([CSV](http://en.wikipedia.org/wiki/Comma-separated_values) <i class="fa fa-external-link"></i>) file stores tabular data (numbers and text) in a plain-text form. A CSV file can be used to store spreadsheet or basic database-style information in a very simple format, with one record on each line, and each field within that record separated by a comma. CSV files are ideal for transferring e.g. contact data from one database (like Salesforce) into another (like Mailjet list).

At Elastic.IO the **CSV connector can be used only as an action component** to read from a CSV file.

## Read from a CSV file - Action

**Read from CSV** component can be used on those cases when the first component provides a CSV file with records that need to be processed with our Data Mapper and transfer to the next stage of integration flow.
