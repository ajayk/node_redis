module.exports.server_version_at_least = server_version_at_least;
module.exports.singleStringReply = singleStringReply;
module.exports.integerReply = integerReply;
module.exports.arrayReply = arrayReply;
module.exports.emptyReply = emptyReply;
module.exports.errorReply = errorReply;
module.exports.singleResult = singleResult;

module.exports.getDirtyClient = getDirtyClient;
module.exports.getClient = getClient;
module.exports.getCleanClient = getCleanClient;

var PORT = 6379;
var HOST = '127.0.0.1';
var DBNUM = 15;

var redis = require("../");
// Running with a truthy argument will enable the wire protocol and other debug logging.
redis.debug_mode = process.argv[2];

function noop () {}

function server_version_at_least(connection, desired_version) {
    // Return true if the server version >= desired_version
    var version = connection.server_info.versions;
    for (var i = 0; i < 3; i++) {
        if (version[i] > desired_version[i]) return true;
        if (version[i] < desired_version[i]) return false;
    }
    return true;
}

function singleStringReply(t, expected) {
    expected = expected || "OK";
    return function (err, reply) {
        t.notOk(err, "No error");
        if (Buffer.isBuffer(reply)) {
            reply = reply.toString();
        }
        t.equals(reply, expected, "Got '" + reply + "' expected value: " + expected);
    };
}

function integerReply(t, expected) {
    return function (err, reply) {
        t.notOk(err, "No error");
        t.equals(reply, expected, "Got '" + reply + "' expected value: " + expected);
    };
}

// NOTE: this is expected to be the final test
function arrayReply(t, expected) {
    return function (err, replies) {
        t.notOk(err, "No error");
        t.equals(replies.length, expected.length, "Wrong number of replies");
        for (var i = 0; i < replies.length; i++) {
            t.deepEqual(replies[i], expected[i], "Got '" + replies[i] + "' expected value: " + expected[i]);
        }
        t.end();
    };
}

function emptyReply(t) {
    return function (err, reply) {
        t.notOk(err, "No error");
        t.notOk(reply, "Empty reply");
    };
}

function errorReply(t) {
    return function (err, reply) {
        t.ok(err, "Error expected");
        t.notOk(reply, "Reply should be empty");
    };
}

function singleResult(t, expected) {
    return function (err, reply) {
        t.notOk(err, "No error");
        t.deepEqual(reply, expected, "Got " + reply + " expected " + expected);
    };
}

// A dirty client won't attempt to flush before running tests.
function getDirtyClient(db, port, host, opts) {
    db = (db != null) ? db : DBNUM;
    port = (port != null) ? port : PORT;
    host = host || HOST;

    var client = redis.createClient(port, host, opts);
    if (db) {
        client.select(db);
    }
    return client;
}

var dbState = {};

function getClient(db, port, host, opts) {
    db = (db != null) ? db : DBNUM;
    port = (port != null) ? port : PORT;
    host = host || HOST;

    if (dbState[db + "~" + port + "~" + host] === undefined) {
        return getCleanClient(db, port, host, opts);
    }

    var client = redis.createClient(port, host, opts);
    if (db) {
        client.select(db);
    }
    return client;
}

function getCleanClient(db, port, host, opts) {
    db = db || DBNUM;
    port = port || PORT;
    host = host || HOST;
    dbState[db + "~" + port + "~" + host] = "clean";
    var client = getClient(db, port, host, opts);
    client.flushdb(noop);
    return client;
}