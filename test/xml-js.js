'use strict';
const fs = require('fs');

var convert = require('xml-js');
var xml =
'<?xml version="1.0" encoding="utf-8"?>' +
'<note importance="high" logged="true">' +
'    <title>Happy</title>' +
'    <todo>Work</todo>' +
'    <todo>Play</todo>' +
'</note>';


var content = fs.readFileSync('C:/etc/ibkteam/smp-jarvis-configurations/jarvis-audit/etc/sample event HTTP Reply.terminal.in.xml');

var result = convert.xml2json(content, {compact: true, spaces: 4});

fs.writeFileSync('./test/monitoring_profile_event.json',result);

//var result2 = convert.xml2json(xml, {compact: false, spaces: 4});

//console.log(result1, '\n', result2);