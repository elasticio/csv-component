describe('CSV Read component', function () {
    process.env.S3_SECRET = process.env.S3_SECRET || 'my-secret';
    process.env.S3_KEY = process.env.S3_KEY       || 'my-key';
    process.env.S3_REGION = process.env.S3_REGION || 'eu-west-1';
    process.env.S3_BUCKET = process.env.S3_BUCKET || 'my-bucket';

    var csv = require('../../../lib/components/csv/read.js');
    var runTest = require('./testrunner.js').runTest;
    var s3 = require('s3').getClient(process.env.S3_BUCKET);
    var moment = require('moment');
    var Q = require('q');
    var fs = require("fs");


    it('empty body', function () {
        runTest(csv.process, {}, {}, function(runner) {
            expect(runner.data.length).toEqual(0);
            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();
        });
    });

    it('non-suitable attachments', function() {
        var msg = {
            id:12345,
            metadata:{},
            attachments:{
                foo : {

                },
                bar : {
                    "content-type" : 'bla'
                }
            },
            body:{}
        };

        runTest(csv.process, msg, {}, function(runner) {
            expect(runner.data.length).toEqual(0);
            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();
        });
    });

    it('should parse simple string rows', function() {

        spyOnS3GetEncrypted('simple.csv');

        var msg = {
            id:12345,
            attachments:{
                foo : {
                    s3 : 'loremipsum.fubar',
                    'content-type' : 'text/csv'
                }
            },
            body:{}
        };

        var cfg =  {
            reader: {
                columns : [
                    {
                        property: "text"
                    },
                    {
                        property: "text2"
                    }
                ]
            }
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(2);

            expect(runner.data[0].body).toEqual( {
                text : 'lorem',
                text2 : 'ipsum'
            });

            expect(runner.data[1].body).toEqual( {
                text : 'dolor',
                text2 : 'sit amet'
            });

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            expect(s3.getEncrypted).toHaveBeenCalledWith("loremipsum.fubar");
        });
    });

    it("non-default delimiter", function() {
        spyOnS3GetEncrypted("colon_del.csv");

        var msg = {
            id:12345,
            attachments:{
                foo : {
                    s3 : 'loremipsum.fubar',
                    'content-type' : 'text/csv'
                }
            },
            body:{}
        };

        var cfg =  {
            reader: {
                separator: ":",
                columns : [
                    {
                        property: "text"
                    },
                    {
                        property: "text2"
                    }
                ]
            }
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(2);

            expect(runner.data[0].body).toEqual( {
                text : 'lorem',
                text2 : 'ipsum'
            });

            expect(runner.data[1].body).toEqual( {
                text : 'dolor',
                text2 : 'sit amet'
            });

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            expect(s3.getEncrypted).toHaveBeenCalledWith("loremipsum.fubar");
        });
    });

    it("should parse simple date rows", function() {
        spyOnS3GetEncrypted("dates.csv");

        var msg = {
            id:12345,
            attachments:{
                foo : {
                    s3 : 'loremipsum.fubar',
                    'content-type' : 'text/csv'
                }
            },
            body:{}
        };

        var cfg =  {
            reader: {
                columns : [
                    {
                        property: "time",
                        type : "date",
                        format: 'DD/MM/YYYY HH:mm:ss'
                    },
                    {
                        property: "time2",
                        type : "date",
                        format: 'YYYY-MM-DDTHH:mm:ss Z'
                    },
                    {
                        property: "time3",
                        type : "date",
                        format: 'YYYY-MM-DD HH:mm:ss Z'
                    }
                ]
            }
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(1);

            var body = runner.data[0].body;

            expectDate(body.time, 2013, 7, 13, 25, 55);
            expectDate(body.time2, 2013, 7, 14, 12, 5);
            expectDate(body.time3, 2013, 7, 15, 45, 36);

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            expect(s3.getEncrypted).toHaveBeenCalledWith("loremipsum.fubar");
        });
    });

    var expectDate = function(date, year, month, day, minutes, seconds) {

        expect(date.getUTCFullYear()).toEqual(year);
        expect(date.getUTCMonth()).toEqual(month);
        expect(date.getUTCDate()).toEqual(day);
        expect(date.getUTCMinutes()).toEqual(minutes);
        expect(date.getUTCSeconds()).toEqual(seconds);
    };

    it("should parse simple number rows", function() {
        spyOnS3GetEncrypted("numbers.csv");

        var msg = {
            id:12345,
            attachments:{
                foo : {
                    s3 : 'loremipsum.fubar',
                    'content-type' : 'text/csv'
                }
            },
            body:{}
        };

        var cfg =  {
            reader: {
                columns : [
                    {
                        property: "simpleInt",
                        type : "number"
                    },
                    {
                        property: "pi",
                        type : "number",
                        format: 'dec_comma'
                    },
                    {
                        property: "euler",
                        type : "number",
                        format: 'dec_point'
                    }
                ]
            }
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(1);

            var body = runner.data[0].body;

            expect(body.simpleInt).toEqual(123);

            expect(body.pi).toEqual(3.14159265359);

            expect(body.euler).toEqual(2.71828);

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            expect(s3.getEncrypted).toHaveBeenCalledWith("loremipsum.fubar");
        });
    });

    it("should parse US numbers", function() {
        spyOnS3GetEncrypted("numbers_us.csv");

        var msg = {
            id:12345,
            attachments:{
                foo : {
                    s3 : 'loremipsum.fubar',
                    'content-type' : 'text/csv'
                }
            },
            body:{}
        };

        var cfg =  {
            reader: {
                columns : [
                    {
                        property: "simpleInt",
                        type : "number",
                        format: 'dec_point'
                    },
                    {
                        property: "doubleValue",
                        type : "number",
                        format: 'dec_point'
                    }
                ]
            }
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(1);

            var body = runner.data[0].body;

            expect(body.simpleInt).toEqual(123456);

            expect(body.doubleValue).toEqual(123456.789);

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            expect(s3.getEncrypted).toHaveBeenCalledWith("loremipsum.fubar");
        });
    });

    it("should parse DE numbers", function() {
        spyOnS3GetEncrypted("numbers_de.csv");

        var msg = {
            id:12345,
            attachments:{
                foo : {
                    s3 : 'loremipsum.fubar',
                    'content-type' : 'text/csv'
                }
            },
            body:{}
        };

        var cfg =  {
            reader: {
                columns : [
                    {
                        property: "simpleInt",
                        type : "number",
                        format: 'dec_comma'
                    },
                    {
                        property: "doubleValue",
                        type : "number",
                        format: 'dec_comma'
                    },
                    {
                        property: "doubleValue2",
                        type : "number",
                        format: 'dec_comma'
                    }
                ]
            }
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(1);

            var body = runner.data[0].body;

            expect(body.simpleInt).toEqual(123456);

            expect(body.doubleValue).toEqual(123456.789);

            expect(body.doubleValue2).toEqual(111222333);

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            expect(s3.getEncrypted).toHaveBeenCalledWith("loremipsum.fubar");
        });
    });

    var spyOnS3GetEncrypted = function(fileName) {
        spyOn(s3, 'getEncrypted').andCallFake(function() {
            return Q(fs.createReadStream(__dirname + "/test/" + fileName));
        });
    };

});
