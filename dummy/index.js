'use strict';
// ----------------------- external setup

const fs = require('fs');
var ApimEmulator = require('../apim-emulator.js');
var apim = new ApimEmulator();
var ibkredact = require("../ibk-redact-utils.js");

var content = fs.readFileSync('./test/apic_record.json','utf8');
var apicRecord = JSON.parse(content)["_source"];

apim.setvariable('log', apicRecord);
console.log("epa");
//apim.setvariable('log.request_http_headers', apicRecord.request_http_headers);
//apim.setvariable('log.query_string', apicRecord.query_string);

// -------------------------- custom redact call

// TODO: preprocess new Set
var config = {
	"redact": {
		"anywhere": {
			"full": new Set(["currency", "description", "customerCode", "Authorization"]),
			"cc": new Set(["countableMovementDate"])
		},
		"path": {
			"full": new Set(["data.movements.movementBranch"]),
			"cc": new Set(["data.movements.movementPostDate"])
		} 
	},
	"extract": {
		"@traceId": "redacted.request_http_headers_obj.trace-id",
		"@consumerId": "redacted.request_http_headers_obj.consumerId",   
		"@timestamp": "redacted.request_http_headers_obj.timestamp", 
		"@message_plain": "plain.log.response_body",
		"@message": "redacted.response_body",
		"@querystring": "redacted.query_string",
		"@request_http_headers": "redacted.request_http_headers",
		"@gateway_ip": "plain.log.gateway_ip",
		"@branchId": "redacted.query_string_obj.branchCode",
		"@currency": "redacted.query_string_obj.currency",
		"ipOrigen": "redacted.request_http_headers_obj.ipOrigen"
	}
}


var input = ibkredact.createInput(apim.getvariable("log"), config);
var custom_log_record = ibkredact.createCustomLogRecord(input, config);
apim.setvariable("log.custom", custom_log_record);
console.log(custom_log_record);
// TODO: copy redacted to apim 
apim.setvariable("log.response_body", input.redacted.response_body);


