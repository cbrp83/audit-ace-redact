'use strict';

// this non-standard way of building the module, with a function,
// is used to be able to copy paste to apic without using "requires"

// ******* inicio copia hacia global policy
function IbkRedactUtils(cleanItems) {
	this.createInput = function(log, config) {
		var parsedBody = JSON.parse(log.response_body);
		this.redact(parsedBody, null, config.redact);

		var request_http_headers_obj = this.arrayToObject(log.request_http_headers);
		this.redact(request_http_headers_obj, null, config.redact);
		var query_string_obj = this.decodeQueryString(log.query_string);
		this.redact(query_string_obj, null, config.redact);
		var response_body_obj = JSON.parse(log.response_body);
		this.redact(response_body_obj, null, config.redact);

		return {
			redacted: {
				"request_http_headers_obj": request_http_headers_obj,
				"request_http_headers": JSON.stringify(request_http_headers_obj),
				"query_string_obj": query_string_obj,
				"query_string": this.encodeQueryString(query_string_obj),
				"response_body_obj": response_body_obj,
				"response_body": JSON.stringify(response_body_obj),
			},
			plain: {
				log: log
			}
		};
	}

	this.createCustomLogRecord = function(input, config) {
		let result = {};
		for (var k in config.extract) {
			result[k] = this.navigateOpt(input, config.extract[k]);
		}
		return result;
	}

	this.navigateOpt = function(obj, path) {
		var cursor = obj;
		var parts = path.split(".");
		for (var i = 0; i < parts.length; ++i) {
			cursor = cursor[parts[i]];

			if (cursor == undefined) {
				return null;
			}
		}
		return cursor;
	}


	this.findFirstObjectWhere = function(array, key, valueEquals) {
		for (var i = 0; i < array.length; ++i) {
			var element = array[i];
			if (typeof element != 'object') {
				throw `looking for object with key ${key} and value ${valueEquals}, but found ` +
					`non-object at index ${i}`;
			}
			var value = element[key];
			if (value == valueEquals) {
				return element;
			}
		}
		return null;
	}

	// copied from https://stackoverflow.com/a/3855394
	this.decodeQueryString = function(queryStr) {
		if (queryStr == "") return {};
		var elements = queryStr.split('&');
		var result = {};
		for (var i = 0; i < elements.length; ++i) {
			var keyval = elements[i].split('=', 2);
			if (keyval.length == 1)
				result[keyval[0]] = "";
			else
				result[keyval[0]] = decodeURIComponent(keyval[1].replace(/\+/g, " "));
		}
		return result;
	}

	// copied from https://stackoverflow.com/a/34209399
	this.encodeQueryString = function(params) {
		return Object.keys(params)
			.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
			.join('&');
	}

	//console.log(arrayToObject(obj.request_http_headers));

	// apic headers are in an array of elements, each with 1 key.
	// This function converts that useless format into an object with several keys
	this.arrayToObject = function(objArray) {
		var obj = {};
		var len = objArray.length;
		for (var i = 0; i < len; i++) {
			var innerObj = objArray[i];
			for (var key in innerObj) {
				obj[key] = innerObj[key];
			}
		}
		return obj;
	}

	this.redact = function(obj, path, redactConfig) {
		for (var k in obj) {
			var value = obj[k];
			if (value == null) {
				continue;
			}
			this.redactAny(obj, value, path, k, redactConfig);
		}
	}

	this.redactAny = function(parent, value, path, k, redactConfig) {
		if (Array.isArray(value)) {
			var len = value.length;
			for (var i = 0; i < len; i++) {
				this.redactAny(parent, value[i], path, k, redactConfig);
			}
		} else if (typeof value === 'object') {
			// This only applies to ace monitoring events
			var items = value["Item"];
			if (cleanItems && Array.isArray(items) && Object.keys(value).length == 1) {
				parent[k] = items;
				console.log(`removed "Item" tag on path ${path} ${JSON.stringify(parent)}`);
				this.redactAny(parent, items, path, k, redactConfig);
			} else {
				this.redact(value, this.buildPath(path, k), redactConfig);
			}
		} else {
			this.redactField(parent, k, path, redactConfig);
		}
	}

	this.buildPath = function(path, k) {
		var parts = [];
		if (path != null) {
			parts.push(path);
		}
		parts.push(k);
		return parts.join(".", parts);
	}

	this.redactField = function(parent, k, path, redactConfig) {
		if (!parent.hasOwnProperty(k)) {
			return;
		}
		var path = this.buildPath(path, k);
		// console.log("path = " + path);
		// TODO: handle optional full
		if (redactConfig.anywhere.full.has(k) || redactConfig.path.full.has(path)) {
			//console.log(buildPath(path,k));
			parent[k] = "*".repeat(String(parent[k]).length);
		}

		if (redactConfig.anywhere.cc.has(k) || redactConfig.path.cc.has(path)) {
			//console.log(buildPath(path,k));
			parent[k] = this.partialRedactCCnumbers(parent[k]);
		}
	}

	this.partialRedactCCnumbers = function(ccNumbers) {
		// With this regex "(.*?)(.{0,6})(.{0,4})" less code is used
		// but performance is worse
		if (ccNumbers == null) {
			return null;
		}
		ccNumbers = ccNumbers.replace(/ /g, "");
		ccNumbers = ccNumbers.replace(/\-/g, "");

		const MAX_redact = 6;
		const MAX_RIGHT = 4;
		var len = ccNumbers.length;
		var lenredactd = Math.min(len, MAX_redact);
		var extra = Math.max(len - MAX_redact, 0);
		var lenRight = Math.min(extra, MAX_RIGHT);
		var lenLeft = len - lenredactd - lenRight;

		var extraLeft = ccNumbers.substr(0, lenLeft);
		var redactd = "*".repeat(lenredactd);
		var extraRight = ccNumbers.substr(lenLeft + lenredactd);

		//console.log(extraLeft + "," + redactd + "," + extraRight);
		return extraLeft + redactd + extraRight;
	}
}
// ******* fin copia hacia global policy

module.exports = IbkRedactUtils;

// these functions should be private, but are left public for easier unit testing:
// redactField, partialRedactCCnumbers
// module.exports = {
// 	createInput,
// 	createCustomLogRecord,
// 	decodeQueryString,
// 	encodeQueryString,
// 	redact,
// 	buildPath,
// 	redactField,
// 	partialRedactCCnumbers
// }