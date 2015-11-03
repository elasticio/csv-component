var nock = require('nock');

describe('CSV Read component', function () {
    var csv = require('../lib/read.js');
    var runTest = require('./testrunner.js').runTest;
    var moment = require('moment');
    var Q = require('q');
    var fs = require("fs");

    nock('http://test.env.mock')
        .get('/simple.csv')
        .replyWithFile(200, __dirname + '/test/simple.csv');

    nock('http://test.env.mock')
        .get('/dates.csv')
        .replyWithFile(200, __dirname + '/test/dates.csv');

    nock('http://test.env.mock')
        .get('/numbers.csv')
        .replyWithFile(200, __dirname + '/test/numbers.csv');

    nock('http://test.env.mock')
        .get('/numbers_us.csv')
        .replyWithFile(200, __dirname + '/test/numbers_us.csv');

    nock('http://test.env.mock')
        .get('/numbers_de.csv')
        .replyWithFile(200, __dirname + '/test/numbers_de.csv');

    function expectDate(date, year, month, day, minutes, seconds) {
        expect(date.getUTCFullYear()).toEqual(year);
        expect(date.getUTCMonth()).toEqual(month);
        expect(date.getUTCDate()).toEqual(day);
        expect(date.getUTCMinutes()).toEqual(minutes);
        expect(date.getUTCSeconds()).toEqual(seconds);
    }


    it('empty body', function(done) {
        runTest(csv.process, {}, {}, function(runner) {
            expect(runner.data.length).toEqual(0);
            expect(runner.errors.length).toEqual(1);
            expect(runner.snapshot).toBeUndefined();
            done();
        });
    });


    it('should parse simple string rows', function(done) {

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
            },
            url: "http://test.env.mock/simple.csv"
        };

        runTest(csv.process, {} , cfg, function(runner) {
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
            done();
        });
    });

    it("should parse simple date rows", function(done) {

        var msg = {
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
            },
            url : "http://test.env.mock/dates.csv"
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(1);

            var body = runner.data[0].body;

            expectDate(body.time, 2013, 7, 13, 25, 55);
            expectDate(body.time2, 2013, 7, 14, 12, 5);
            expectDate(body.time3, 2013, 7, 15, 45, 36);

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            done();

        });
    });


    it("should parse simple number rows", function(done) {

        var msg = {};

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
            },
            url : "http://test.env.mock/numbers.csv"
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(1);

            var body = runner.data[0].body;

            expect(body.simpleInt).toEqual(123);

            expect(body.pi).toEqual(3.14159265359);

            expect(body.euler).toEqual(2.71828);

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            done();
        });
    });

    it("should parse US numbers", function(done) {

        var msg = {};

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
            },
            url : "http://test.env.mock/numbers_us.csv"
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(1);

            var body = runner.data[0].body;

            expect(body.simpleInt).toEqual(123456);

            expect(body.doubleValue).toEqual(123456.789);

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            done();
        });
    });

    it("should parse DE numbers", function(done) {
        var msg = {};

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
            },
            url : "http://test.env.mock/numbers_de.csv"
        };

        runTest(csv.process, msg, cfg, function(runner) {
            expect(runner.data.length).toEqual(1);

            var body = runner.data[0].body;

            expect(body.simpleInt).toEqual(123456);

            expect(body.doubleValue).toEqual(123456.789);

            expect(body.doubleValue2).toEqual(111222333);

            expect(runner.errors.length).toEqual(0);
            expect(runner.snapshot).toBeUndefined();

            done();
        });
    });

});
