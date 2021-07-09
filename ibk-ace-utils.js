'use strict';

// this non-standard way of building the module, with a function,
// is used to be able to copy paste to apic without using "requires"
function IbkAceUtils() {
	this.createInput = function(monEventXml, config) {
		var xml2json = require('xml2json');
		var IbkRedactUtils = require("./ibk-redact-utils.js");
		var ibkredact = new IbkRedactUtils(true);

		var event = JSON.parse(xml2json.toJson(monEventXml));
		var plain_event = JSON.parse(xml2json.toJson(monEventXml));
		var content = ibkredact.navigateOpt(event, "mon:event.mon:applicationData.mon:complexContent");

		// request
		var rest = ibkredact.findFirstObjectWhere(content, "mon:elementName", "REST");
		var request = ibkredact.navigateOpt(rest, "REST.Input");
		ibkredact.redact(request, null, config.redact);
		
		// response
		var data = ibkredact.findFirstObjectWhere(content, "mon:elementName", "Data");
		var response = ibkredact.navigateOpt(data, "Data");
		ibkredact.redact(response, null, config.redact);

		return {
			redacted: {
				"request_obj": request,
				"response_obj": response,
				"response": JSON.stringify(response),
			},
			plain: {
				event: plain_event
			}
		};
	}
}

module.exports = IbkAceUtils;