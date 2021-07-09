'use strict';
const fs = require('fs');

var parser = require('xml2json');

var IbkRedactUtils = require("../ibk-redact-utils.js");
var ibkredact = new IbkRedactUtils();


var content = fs.readFileSync('C:/etc/ibkteam/smp-jarvis-configurations/jarvis-audit/etc/sample event HTTP Reply.terminal.in.xml'); 
var json = parser.toJson(content);
var obj = JSON.parse(json);

var dst = ibkredact.navigateOpt(obj, "mon:event.mon:applicationData.mon:complexContent");
var rest = ibkredact.findFirstObjectWhere(dst, "mon:elementName", "REST");
var request = ibkredact.navigateOpt(rest, "REST.Input")

fs.writeFileSync('./test/extract_request_expected.json',JSON.stringify(request,null,4));
