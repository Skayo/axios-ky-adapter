'use strict';

var settle = require('axios/lib/core/settle');
var buildFullPath = require('axios/lib/core/buildFullPath');
var createError = require('axios/lib/core/createError');
var buildURL = require('axios/lib/helpers/buildURL');
var parseHeaders = require('axios/lib/helpers/parseHeaders');
var isURLSameOrigin = require('axios/lib/helpers/isURLSameOrigin');
var cookies = require('axios/lib/helpers/cookies');
var utils = require('axios/lib/utils');
var ky = require('ky-universal');

module.exports = function kyAdapter(config) {
	// At this point:
	//  - config has been merged with defaults
	//  - request transformers have already run
	//  - request interceptors have already run

	// Make the request using config provided
	// Upon response settle the Promise

	return new Promise(function (resolve, reject) {
		var requestData = config.data;
		var requestHeaders = config.headers;

		if (utils.isFormData(requestData)) {
			delete requestHeaders['Content-Type']; // Let the browser set it
		}

		if (
			(utils.isBlob(requestData) || utils.isFile(requestData)) &&
			requestData.type
		) {
			delete requestHeaders['Content-Type']; // Let the browser set it
		}

		var request;

		// HTTP basic authentication
		if (config.auth) {
			var username = config.auth.username || '';
			var password = unescape(encodeURIComponent(config.auth.password)) || '';
			requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
		}

		var fullPath = buildFullPath(config.baseURL, config.url);

		var requestUrl = buildURL(fullPath, config.params, config.paramsSerializer);
		var options = {
			method:  config.method.toLowerCase(),
			timeout: config.timeout || false, // Set the request timeout in MS
		};
		var kyOptions = config.kyOptions || {};

		function handleLoad(response, responseData) {
			settle(resolve, reject, {
				data:       responseData,
				status:     response.status,
				statusText: response.statusText,
				headers:    response.headers,
				config:     config,
				request:    request,
			});
		}

		function handleAbort(error) {
			reject(createError('Request aborted', config, 'ECONNABORTED', request));

			// Clean up request
			request = null;
		}

		function handleError(error) {
			// Real errors are hidden from us by the browser
			// onerror should only fire if it's a network error
			reject(createError('Network Error', config, null, request));

			// Clean up request
			request = null;
		}

		// Add xsrf header
		// This is only done if running in a standard browser environment.
		// Specifically not if we're in a web worker, or react-native.
		if (utils.isStandardBrowserEnv()) {
			// Add xsrf header
			var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
				cookies.read(config.xsrfCookieName) :
				undefined;

			if (xsrfValue) {
				requestHeaders[config.xsrfHeaderName] = xsrfValue;
			}
		}

		// Add headers to the request
		options.headers = {};
		utils.forEach(requestHeaders, function setRequestHeader(val, key) {
			if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
				// Remove Content-Type if data is undefined
				delete requestHeaders[key];
			} else {
				// Otherwise add header to the request
				options.headers[key] = val;
			}
		});

		// Add withCredentials to request if needed
		if (!utils.isUndefined(config.withCredentials)) {
			options.credentials = !!config.withCredentials ? 'include' : 'same-origin';
		}

		// Add responseType to request if needed
		var responseType = config.responseType || null;

		if (responseType === 'stream') {
			reject(createError('The "stream" response type is not supported in ky yet', config, 'ENOSTREAM', request));

			// Clean up request
			request = null;
			return;
		}

		// Handle progress if needed
		if (typeof config.onDownloadProgress === 'function') {
			options.onDownloadProgress = function (progress, chunk) {
				config.onDownloadProgress(
					new ProgressEvent('progress', {
						lengthComputable: progress.totalBytes !== 0,
						loaded:           progress.transferredBytes,
						total:            progress.totalBytes,
					}),
				);
			};
		}

		if (config.cancelToken) {
			// Handle cancellation
			var abortController = new AbortController();
			options.signal = abortController.signal;

			config.cancelToken.promise.then(function onCanceled(cancel) {
				abortController.abort();
				reject(cancel);
				// Clean up request
				request = null;
			});
		}

		if (!requestData) {
			requestData = null;
		}

		(async function() {
			try {
				var bodyMethod = 'json';
				var bodyMethodAfter;

				switch (responseType) {
					case 'arraybuffer':
						bodyMethod = 'arrayBuffer';
						break;

					case 'blob':
					case 'text':
						bodyMethod = responseType;
						break;

					case 'document':
						bodyMethod = 'text';
						bodyMethodAfter = function (input) {
							return new DOMParser().parseFromString(input, 'text/html');
						};
						break;
				}

				var response = await ky(requestUrl, Object.assign(options, options.kyOptions));
				var responseData = await response[bodyMethod]();

				if (bodyMethodAfter) responseData = bodyMethodAfter(responseData);

				handleLoad(response, responseData);
			} catch (error) {
				if (error.name === 'AbortError') {
					handleAbort(error);
				} else {
					handleError(error);
				}
			}
		})();
	});
};