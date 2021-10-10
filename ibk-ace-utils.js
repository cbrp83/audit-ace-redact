'use strict';

// this non-standard way of building the module, with a function,
// is used to be able to copy paste to apic without using "requires"
function IbkAceUtils() {

	this.createInput = function(monEventXml) {
		
        var xml2json = require('xml2json');
		var IbkRedactUtils = require("./ibk-redact-utils.js");
		var ibkredact = new IbkRedactUtils(true);

		var event = JSON.parse(xml2json.toJson(monEventXml));
        var content = ibkredact.navigateOpt(event, "mon:event.mon:applicationData.mon:complexContent");
        var redactConfig = ibkredact.navigateOpt(event, "mon:event.mon:applicationData.mon:simpleContent.mon:value");
        var config_service = JSON.parse(redactConfig);
        var structures_audit = config_service.structuresAudit;

        let data_return = {};
        data_return['config'] = config_service;
        
        //Config Transaction
        var transaction_obj = structures_audit.transaction || config_service.redactTransaction ? content.DataAudit.Transaction : "";
        data_return['transaction'] = transaction_obj;
        data_return['transaction_plain'] = JSON.stringify(transaction_obj);

        //Config and redact information in Parameters
        var parameters_obj = structures_audit.parameters || config_service.redactParameters ? content.DataAudit.Parameters : "";
        if (config_service.redactParameters){
            ibkredact.redact(parameters_obj, null, config_service.redactParameters);
        }
        data_return['parameters'] = parameters_obj;
        data_return['parameters_plain'] = JSON.stringify(parameters_obj);
        
        //Config and redact information in Input Message
        var input_obj = structures_audit.input_body || config_service.redactInputBody ? content.DataAudit.Input : "";
        if (config_service.redactInputBody && input_obj){
            ibkredact.redact(input_obj, null, config_service.redactInputBody);
        }
        data_return['input_body'] = input_obj;
        data_return['input_body_plain'] = JSON.stringify(input_obj);

        //Obtener los mensajes de Request y Response
        var numberOfServices = parseInt(transaction_obj.Services);
        for (let i = 1; i <= numberOfServices; i++) {
            
            // Config and redact information in Request Message
            var request_obj = ibkredact.navigateOpt(content, "DataAudit.RequestService0"+i );
            var redactStructureRequest = ibkredact.navigateOpt(config_service, "redactBodyRequest0"+i);
            if (redactStructureRequest && request_obj){
                ibkredact.redact(request_obj, null, redactStructureRequest);
            }
            data_return['request_body_0'+i] = request_obj;
            data_return['request_body_0'+i+'_plain'] = JSON.stringify(request_obj);

            //Config and redact information in Response Message
            var response_obj = ibkredact.navigateOpt(content, "DataAudit.ResponseService0"+i );
            var redactStructureReponse = ibkredact.navigateOpt(config_service, "redactBodyResponse0"+i);
            if (redactStructureReponse && response_obj){
                ibkredact.redact(response_obj, null, redactStructureReponse);
            }
            data_return['response_body_0'+i] = response_obj;
            data_return['response_body_0'+i+'_plain'] = JSON.stringify(response_obj);
        }

        //Config and redact information in Reply Message
        var reply_obj = structures_audit.reply_body || config_service.redactReplyBody ? content.DataAudit.Reply : "";
        if (config_service.redactReplyBody && reply_obj){
            ibkredact.redact(reply_obj, null, config_service.redactReplyBody);
        }
        data_return['reply_body'] = reply_obj;
        data_return['reply_body_plain'] = JSON.stringify(reply_obj);
        
        return data_return;
	}
}

module.exports = IbkAceUtils;