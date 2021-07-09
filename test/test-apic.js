'use strict';

var IbkRedactUtils = require("../ibk-redact-utils.js");
var ibkredact = new IbkRedactUtils();
var ApimEmulator = require('../apim-emulator.js');


//var assert = require('assert');
var assert = require('chai').assert;
const fs = require('fs');

describe('Array', function() {
	describe('#indexOf()', function() {
		it('should return -1 when the value is not present', function() {
			assert.equal([1, 2, 3].indexOf(4), -1);
		});
		it('should return 0 when the value is on index 0', function() {
			assert.equal([1, 2, 3].indexOf(1), 0);
		});

	});
});


describe('redact tests', function() {
	it('should mask properly', function() {
		assert.equal("*", ibkredact.partialRedactCCnumbers("1"));
		assert.equal("******", ibkredact.partialRedactCCnumbers("123456"));
		assert.equal("******7890", ibkredact.partialRedactCCnumbers("1234567890"));
		assert.equal("A******7890", ibkredact.partialRedactCCnumbers("A1234567890"));
		// amex sin espacios entre bloques
		assert.equal("ABCDE******7890", ibkredact.partialRedactCCnumbers("ABCDE1234567890"));
		// visa sin espacios entre bloques
		assert.equal("ABCDEF******7890", ibkredact.partialRedactCCnumbers("ABCDEF1234567890"));
		// visa con espacios entre bloques
		assert.equal("ABCDEF******7890", ibkredact.partialRedactCCnumbers("ABCD EF12 3456 7890"));
		// visa con guiones entre bloques
		assert.equal("ABCDEF******7890", ibkredact.partialRedactCCnumbers("ABCD-EF12-3456-7890"));
	});
});

describe('partialRedactCCnumbers', function() {
	var content = fs.readFileSync('./test/apic_record.json','utf8');
	var config = {
		"redact": {
			"anywhere": {
				"full": new Set(["currency", "description", "customerCode", "Authorization"]),
				"cc": new Set(["ccNum"])
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
	
	it('should mask path full', function() {
		let parent = {
			"movementBranch": "sample",
			"currency": "604",
			"otherField": "othervalue"
		}
		let parentExpected = {
			"movementBranch": "******",
			"currency": "604",
			"otherField": "othervalue"
		}
		ibkredact.redactField(parent, "movementBranch", "data.movements", config.redact);
		assert.deepEqual(parentExpected, parent);
	});

	it('should mask path cc', function() {
		let parent = {
			"ccNum": "ABCD EF12 3456 7890",
			"currency": "604",
			"otherField": "othervalue"
		}
		let parentExpected = {
			"ccNum": "ABCDEF******7890",
			"currency": "604",
			"otherField": "othervalue"
		}
		ibkredact.redactField(parent, "ccNum", "data.movements", config.redact);
		assert.deepEqual(parentExpected, parent);
	});

	it('should not mask different path', function() {
		let parent = {
			"movementBranch": "sample",
			"otherField": "othervalue"
		}
		let parentExpected = {
			"movementBranch": "sample",
			"otherField": "othervalue"
		}
		ibkredact.redactField(parent, "movementBranch", "data.movements.DIFFERENT", config.redact);
		assert.deepEqual(parentExpected, parent);
	});	


	it('should mask basic', function() {
		let parent = {
			"currency": "604",
			"otherField": "othervalue"
		}
		let parentExpected = {
			"currency": "***",
			"otherField": "othervalue"
		}
		ibkredact.redactField(parent, "currency", "any", config.redact);
		assert.deepEqual(parentExpected, parent);
	});


	it('should mask basic cc', function() {
		let parent = {
			"ccNum": "ABCD EF12 3456 7890",
			"otherField": "othervalue"
		}
		let parentExpected = {
			"ccNum": "ABCDEF******7890",
			"otherField": "othervalue"
		}
		ibkredact.redactField(parent, "ccNum", "any", config.redact);
		assert.deepEqual(parentExpected, parent);
	});


	it('should create normalized input', function() {		
		let apim = new ApimEmulator();
		let content = fs.readFileSync('./test/apic_record.json','utf8');
		let apicRecord = JSON.parse(content)["_source"];
		apim.setvariable('log', apicRecord);

		var input = ibkredact.createInput(apim.getvariable("log"), config);
		let expectedInput = fs.readFileSync('./test/input_record.json', 'utf8').replace(/\r\n/g, "\n");
		fs.writeFileSync('./test/input_record_actual.json', JSON.stringify(input,null,4));
		assert.equal(expectedInput, JSON.stringify(input,null,4));

		// assert.equal(parentExpected, parent);

		// var custom_log_record = ibkredact.createCustomLogRecord(input, config);
		// apim.setvariable("log.custom", custom_log_record);
		// console.log(custom_log_record);
		// apim.setvariable("log.response_body", input.redacted.response_body);

		// let expectedRecord = fs.readFileSync('./test/redacted_apic_record.json','utf8');
		// assert.equal(parentExpected, parent);
	});

	it('should create custom log record', function() {		
		let apim = new ApimEmulator();
		let content = fs.readFileSync('./test/apic_record.json','utf8');
		let apicRecord = JSON.parse(content)["_source"];
		apim.setvariable('log', apicRecord);

		var input = JSON.parse(fs.readFileSync('./test/input_record.json'));
		let expected_custom_log_record = fs.readFileSync('./test/custom_log_record.json', 'utf8').replace(/\r\n/g, "\n");
		let custom_log_record = ibkredact.createCustomLogRecord(input, config);
		assert.equal(expected_custom_log_record, JSON.stringify(custom_log_record,null,4));


		// apim.setvariable("log.custom", custom_log_record);
		// console.log(custom_log_record);
		// apim.setvariable("log.response_body", input.redacted.response_body);

		
		// let expectedRecord = fs.readFileSync('./test/redacted_apic_record.json','utf8');
		// assert.equal(parentExpected, parent);
	});


});