var messages = require('elasticio-node').messages;
var _ = require('underscore');
var Q = require('q');
var uuid = require('node-uuid');

describe('CSV Write component', function () {
    var csv = require('../lib/write.js');

    xit('empty body', function () {
        var msg = {
            id: 12345,
            metadata: {},
            attachments: {},
            body: {}
        };

        var cfg = {};

        csv.process(msg, cfg, function (err, nextMsg) {

            expect(err).toBeNull();

            expect(nextMsg.id).toEqual(12345);
            expect(nextMsg.metadata).toEqual({});
            expect(nextMsg.attachments).toEqual({});
            expect(nextMsg.body).toEqual({});

        });
    });

    xit('values of object type are not ignored', function () {
        var msg = {
            id:12345,
            attachments:{},
            body:{
                firstName:'Homer'
            }
        };

        var cfg = {
            csv : {
                columns : [
                    {
                        'property' : 'firstName',
                        'title' : 'First Name'
                    }
                ]
            }
        };

        var args;
        spyOn(messages, 'addS3Attachment').andCallFake(function (msg, name, data, contentType) {
            args = [msg, name, data, contentType];
            return Q(true);
        });

        csv.process(msg, cfg, function (err, nextMsg) {
            expect(err).toBeNull();
            assertAttachment(args, msg, 'First Name\nHomer');
        });

    });

    xit('should add s3 link to attachments', function () {
        var msg = {
            id:12345,
            attachments:{},
            body:{
                firstName:'Homer'
            }
        };

        var cfg = {
            csv : {
                columns : [
                    {
                        'property' : 'firstName',
                        'title' : 'First Name'
                    }
                ]
            }
        };

        spyOn(messages, 'addS3Attachment').andCallFake(function (msg, fileName) {
            msg.attachments[fileName] = {
                s3: 'path/on/s3'
            };
            return Q(msg);
        });

        csv.process(msg, cfg, function (err, nextMsg) {
            expect(err).toBeNull();
            expect(Object.keys(nextMsg.attachments).length).toEqual(1);
            expect(nextMsg.attachments['untitled.csv'].s3).toEqual('path/on/s3');
        });

    });

    xit('null values', function () {
        var msg = {
            id:12345,
            attachments:{},
            body:{
                firstName: null
            }
        };

        var cfg = {
            csv : {
                columns : [
                    {
                        'property' : 'firstName',
                        'title' : 'First Name'
                    }
                ]
            }
        };
        var args;

        spyOn(messages, 'addS3Attachment').andCallFake(function (msg, name, data, contentType) {
            args = [msg, name, data, contentType];
            return Q(true);
        });

        csv.process(msg, cfg, function (err) {
            expect(err).toBeNull();
            assertAttachment(args, msg, 'First Name\n');
        });
    });

    xit('multiple headers', function () {

        var msg = {
            id:12345,
            attachments:{},
            body:{
                firstName: 'Homer',
                lastName : 'Simpson'
            }
        };

        var cfg = {
            csv : {
                columns : [
                    {
                        'property' : 'firstName',
                        'title' : 'First Name'
                    },
                    {
                        'property' : 'lastName',
                        'title' : 'Last Name'
                    }
                ]
            }
        };

        var args;

        spyOn(messages, 'addS3Attachment').andCallFake(function (msg, name, data, contentType) {
            args = [msg, name, data, contentType];
            return Q(true);
        });

        csv.process(msg, cfg, function (err) {
            expect(err).toBeNull();
            assertAttachment(args, msg, 'First Name,Last Name\nHomer,Simpson');
        });

    });

    xit('with line breaks', function () {

        var msg = {
            id:12345,
            attachments:{},
            body:{
                firstName: 'Homer',
                lastName : 'Simp\nson'
            }
        };

        var cfg = {
            csv : {
                columns : [
                    {
                        'property' : 'firstName',
                        'title' : 'First\nName'
                    },
                    {
                        'property' : 'lastName',
                        'title' : 'Last Name'
                    }
                ]
            }
        };
        var args;

        spyOn(messages, 'addS3Attachment').andCallFake(function (msg, name, data, contentType) {
            args = [msg, name, data, contentType];
            return Q(true);
        });

        csv.process(msg, cfg, function (err) {
            expect(err).toBeNull();
            assertAttachment(args, msg, '"First\nName",Last Name\nHomer,"Simp\nson"');
        });
    });


    xit('with numeric and boolean values', function () {

        var msg = {
            id:12345,
            attachments:{},
            body:{
                firstName: 'Homer',
                lastName : 'Simpson',
                age : 44.6,
                married : true
            }
        };

        var cfg = {
            csv : {
                columns : [
                    {
                        'property' : 'firstName',
                        'title' : 'First Name'
                    },
                    {
                        'property' : 'age',
                        'title' : 'How Old?'
                    },
                    {
                        'property' : 'married',
                        'title' : 'Married?'
                    }
                ]
            }
        };

        var args;

        spyOn(messages, 'addS3Attachment').andCallFake(function (msg, name, data, contentType) {
            args = [msg, name, data, contentType];
            return Q(true);
        });

        csv.process(msg, cfg, function (err) {
            expect(err).toBeNull();
            assertAttachment(args, msg, 'First Name,How Old?,Married?\nHomer,44.6,true');
        });
    });
});

function assertAttachment(args, msg, value) {
    expect(args[0].id).toEqual(msg.id);
    expect(args[1]).toEqual('untitled.csv');
    expect(args[2].toString()).toEqual(value);
}