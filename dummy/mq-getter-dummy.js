'use strict';

var MqGetter = require("../mq-getter.js");

function justPrint(text) {
	console.log("got " + text);
}

var getter = new MqGetter("localhost(1414)", "DEV.APP.SVRCONN", "QM1", "DEV.QUEUE.1", "mqapp", "trestSkylese1#", justPrint);

getter.startGetter();
console.log("getter finished");
