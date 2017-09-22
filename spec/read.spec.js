'use strict';

const expect = require('chai').expect;

let nock = require('nock');

describe('CSV Read component', function CsvReadComponentTests() {
    let csv = require('../lib/read.js');
    let runTest = require('./testrunner.js').runTest;

    nock('http://test.env.mock')
        .get('/simple.csv')
        .replyWithFile(200, __dirname + '/../test/simple.csv');

    nock('http://test.env.mock')
        .get('/dates.csv')
        .replyWithFile(200, __dirname + '/../test/dates.csv');

    nock('http://test.env.mock')
        .get('/numbers.csv')
        .replyWithFile(200, __dirname + '/../test/numbers.csv');

    nock('http://test.env.mock')
        .get('/numbers_us.csv')
        .replyWithFile(200, __dirname + '/../test/numbers_us.csv');

    nock('http://test.env.mock')
        .get('/numbers_de.csv')
        .replyWithFile(200, __dirname + '/../test/numbers_de.csv');

    function expectDate(date, year, month, day, minutes, seconds) {
        expect(date.getUTCFullYear()).to.equal(year);
        expect(date.getUTCMonth()).to.equal(month);
        expect(date.getUTCDate()).to.equal(day);
        expect(date.getUTCMinutes()).to.equal(minutes);
        expect(date.getUTCSeconds()).to.equal(seconds);
    }


    it('empty body', function emptyBodyTest(done) {
        runTest(csv.process, {}, {}, function emptyBodyTestAssertions(runner) {
            expect(runner.data.length).to.equal(0);
            expect(runner.errors.length).to.equal(1);
            expect(runner.snapshot).to.be.undefined;
            done();
        });
    });


    it('should parse simple string rows', function simpleStringRowsTest(done) {
        let cfg = {
            reader: {
                columns: [
                    {
                        property: 'text'
                    },
                    {
                        property: 'text2'
                    }
                ]
            },
            url: 'http://test.env.mock/simple.csv'
        };

        runTest(csv.process, {} , cfg, function simpleStringRowsTestAssertions(runner) {
            expect(runner.data.length).to.equal(2);

            expect(runner.data[0].body).to.deep.equal({
                text: 'lorem',
                text2: 'ipsum'
            });

            expect(runner.data[1].body).to.deep.equal({
                text: 'dolor',
                text2: 'sit amet'
            });

            expect(runner.errors.length).to.equal(0);
            expect(runner.snapshot).to.be.undefined;
            done();
        });
    });

    it('should parse simple date rows', function simpleDataRowsTest(done) {

        let msg = {};

        let cfg = {
            reader: {
                columns: [
                    {
                        property: 'time',
                        type: 'date',
                        format: 'DD/MM/YYYY HH:mm:ss'
                    },
                    {
                        property: 'time2',
                        type: 'date',
                        format: 'YYYY-MM-DDTHH:mm:ss Z'
                    },
                    {
                        property: 'time3',
                        type: 'date',
                        format: 'YYYY-MM-DD HH:mm:ss Z'
                    }
                ]
            },
            url: 'http://test.env.mock/dates.csv'
        };

        runTest(csv.process, msg, cfg, function simpleDataRowsTestAssertions(runner) {
            expect(runner.data.length).to.equal(1);

            let body = runner.data[0].body;

            expectDate(body.time, 2013, 7, 13, 25, 55);
            expectDate(body.time2, 2013, 7, 14, 12, 5);
            expectDate(body.time3, 2013, 7, 15, 45, 36);

            expect(runner.errors.length).to.equal(0);
            expect(runner.snapshot).to.be.undefined;

            done();

        });
    });


    it('should parse simple number rows', function simpleNumberRowsTest(done) {

        let msg = {};

        let cfg = {
            reader: {
                columns: [
                    {
                        property: 'simpleInt',
                        type: 'number'
                    },
                    {
                        property: 'pi',
                        type: 'number',
                        format: 'dec_comma'
                    },
                    {
                        property: 'euler',
                        type: 'number',
                        format: 'dec_point'
                    }
                ]
            },
            url: 'http://test.env.mock/numbers.csv'
        };

        runTest(csv.process, msg, cfg, function simpleNumberRowsTestAssertions(runner) {
            expect(runner.data.length).to.equal(1);

            let body = runner.data[0].body;

            expect(body.simpleInt).to.equal(123);

            expect(body.pi).to.equal(3.14159265359);

            expect(body.euler).to.equal(2.71828);

            expect(runner.errors.length).to.equal(0);
            expect(runner.snapshot).to.be.undefined;

            done();
        });
    });

    it('should parse US numbers', function usNumbersTest(done) {

        let msg = {};

        let cfg = {
            reader: {
                columns: [
                    {
                        property: 'simpleInt',
                        type: 'number',
                        format: 'dec_point'
                    },
                    {
                        property: 'doubleValue',
                        type: 'number',
                        format: 'dec_point'
                    }
                ]
            },
            url: 'http://test.env.mock/numbers_us.csv'
        };

        runTest(csv.process, msg, cfg, function usNumbersTestAssertions(runner) {
            expect(runner.data.length).to.equal(1);

            let body = runner.data[0].body;

            expect(body.simpleInt).to.equal(123456);

            expect(body.doubleValue).to.equal(123456.789);

            expect(runner.errors.length).to.equal(0);
            expect(runner.snapshot).to.be.undefined;

            done();
        });
    });

    it('should parse DE numbers', function deNumbersTest(done) {
        let msg = {};

        let cfg = {
            reader: {
                columns: [
                    {
                        property: 'simpleInt',
                        type: 'number',
                        format: 'dec_comma'
                    },
                    {
                        property: 'doubleValue',
                        type: 'number',
                        format: 'dec_comma'
                    },
                    {
                        property: 'doubleValue2',
                        type: 'number',
                        format: 'dec_comma'
                    }
                ]
            },
            url: 'http://test.env.mock/numbers_de.csv'
        };

        runTest(csv.process, msg, cfg, function deNumbersTestAssertions(runner) {
            expect(runner.data.length).to.equal(1);

            let body = runner.data[0].body;

            expect(body.simpleInt).to.equal(123456);

            expect(body.doubleValue).to.equal(123456.789);

            expect(body.doubleValue2).to.equal(111222333);

            expect(runner.errors.length).to.equal(0);
            expect(runner.snapshot).to.be.undefined;

            done();
        });
    });

});
