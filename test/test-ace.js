'use strict';

var AceUtils = require("../ibk-ace-utils.js");
var aceUtils = new AceUtils();

//var assert = require('assert');
var assert = require('chai').assert;
const fs = require('fs');

describe('partialRedactCCnumbers ace', function() {
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
			"@branchId": "redacted.request.Parameters.branchCode",
			"@currency": "redacted.request.Parameters.currency"
		}
	}		

	it('should create normalized ace input', function() {
		let eventXml = fs.readFileSync('./test/monitoring-event.xml','utf8');

		var input = aceUtils.createInput(eventXml, config);
		//let expectedInput = fs.readFileSync('./test/input_record.json', 'utf8').replace(/\r\n/g, "\n");
		fs.writeFileSync('./test/input_ace_actual.json', JSON.stringify(input,null,4));
		//assert.equal(expectedInput, JSON.stringify(input,null,4));
	});

});