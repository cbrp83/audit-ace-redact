'use strict';

// emulation of api connect apim object
function ApimEmulator()	{
	this.map = {};
	this.getvariable = function(key) {
		return this.map[key];
	};
	this.setvariable = function(key,value) {
		this.map[key] = value;
	};
}

module.exports = ApimEmulator;