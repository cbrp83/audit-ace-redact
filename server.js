'use strict';

var IbkRedactUtils = require("./ibk-redact-utils.js");
var ibkredact = new IbkRedactUtils();
var AceUtils = require("./ibk-ace-utils.js");
var aceUtils = new AceUtils();
var MqGetter = require("./mq-getter.js");
const yargs = require('yargs');
const axios = require("axios");
const fs = require('fs');

var config = JSON.parse(fs.readFileSync('config/config.json'));

console.log(JSON.stringify(config));
// TODO: handle non existent params
config.redact.anywhere.full = new Set(config.redact.anywhere.full);
config.redact.anywhere.cc = new Set(config.redact.anywhere.cc);
config.redact.path.full = new Set(config.redact.path.full);
config.redact.path.cc = new Set(config.redact.path.cc);


function processEvent(eventXml) {
    console.log("got " + eventXml.substring(0, 10));
    let input = aceUtils.createInput(eventXml, config);
    //console.log("input=" + JSON.stringify(input, null, 4));
    let custom_log_record = ibkredact.createCustomLogRecord(input, config);
    let custom_log_record_str = JSON.stringify(custom_log_record, null, 4);
    console.log("sending to nr custom rec=" + custom_log_record_str);

    axios({
        method: "POST",
        url: 'https://log-api.newrelic.com/log/v1',
        headers: custom_headers,
        data: custom_log_record_str
    }).then(function(response) {
        console.log(response.status);
        console.log(response.data);
    }).catch(function(error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.log(error.request);
            console.log("-------------------- error in request ---------------");
        } else {
            // Something happened in setting up the request that triggered an Error
            console.log('Error', error.message);
        }
        console.log(error.config);
    });
}

const params = yargs(process.argv.slice(2))
    .options({
        'mqhost': {
            describe: 'mq server host',
            alias: 'h',
            demandOption: true
        },
        'mqport': {
            description: 'mq server port',
            alias: 't',
            demandOption: true
        },
        'mqchannel': {
            description: 'mq channel',
            alias: 'c',
            demandOption: true
        },
        'queuemanager': {
            description: 'queue manager',
            alias: 'm',
            demandOption: true
        },
        'queue': {
            description: 'queue',
            alias: 'q',
            demandOption: true
        },
        'mquser': {
            description: 'mquser',
            alias: 'u',
            demandOption: true
        },
        'mqpassword': {
            description: 'mqpassword',
            alias: 'p',
            demandOption: true
        },
        'nrapikey': {
            description: 'new relic api key',
            alias: 'a',
            demandOption: true
        }
    }).argv;

console.log("running with parameters " + params.mqhost + "(" + params.mqport + ")," +
    params.mqchannel + "," + params.queuemanager +
    "," + params.queue + "," + params.mquser);


const custom_headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Api-Key': params.nrapikey
};


// i.e. -h localhost -t 1414 -c DEV.APP.SVRCONN -m QM1 -q DEV.QUEUE.1 -u mqapp -p password
var getter = new MqGetter(params.mqhost + "(" + params.mqport + ")", params.mqchannel, params.queuemanager,
    params.queue, params.mquser, params.mqpassword, processEvent);

getter.startGetter();
console.log("mq getter callback set");