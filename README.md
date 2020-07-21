# Axios Ky Adapter

> An Axios adapter for Ky, a tiny and elegant HTTP client based on the browser Fetch API

![npm version](https://img.shields.io/npm/v/axios-ky-adapter?style=for-the-badge)
![npm downloads](https://img.shields.io/npm/dt/axios-ky-adapter?style=for-the-badge)
![dependencies](https://img.shields.io/david/Skayo/axios-ky-adapter?style=for-the-badge)

This is an adapter for those who would like to use the Fetch API in Axios.  
I used ky because it simplifies a lot of things, but behind the scenes all requests are done with fetch.  

So if you have an old project that still uses Axios / XHR, and want to switch to the newer standard, then just [throw this adapter in](#usage) and you're good to go!  
I've implemented most of the features available in the built-in Axios XHR Adapter, so it *should* work as before.

## Installation

Using npm:
```shell
$ npm install axios-ky-adapter
```

## Usage

```js
const axios = require('axios');
const kyAdapter = require('axios-ky-adapter');

axios.get('https://example.com', {
     adapter: kyAdapter
}).then(function (response) {
     // handle success
     console.log(response);
}).catch(function (error) {
     // handle error
     console.log(error);
})
```

You can even pass some options directly to ky (which will be passed on to fetch), if you want:
```js
const axios = require('axios');
const kyAdapter = require('axios-ky-adapter');
const fetch = require('isomorphic-unfetch');

axios.get('https://example.com', {
    adapter: kyAdapter,
    kyOptions: {
        mode: 'cors', // set CORS mode (fetch option)
        fetch, // pass custom fetch implementation (ky option)
    }
}).then(function (response) {
     // handle success
     console.log(response);
}).catch(function (error) {
     // handle error
     console.log(error);
})
```

## Browser / Node.js support

This adapter uses `ky-universal` so it should work in the browser and in Node.js.  
For more information check the [ky](https://github.com/sindresorhus/ky) and [ky-universal](https://github.com/sindresorhus/ky-universal) docs!

## Related

- [axios](https://github.com/axios/axios) - Promise based HTTP client for the browser and node.js
- [ky](https://github.com/sindresorhus/ky) - Tiny and elegant HTTP client based on the browser Fetch API
- [ky-universal](https://github.com/sindresorhus/ky-universal) - Use Ky in both Node.js and browsers

## [License](https://github.com/Skayo/axios-ky-adapter/blob/master/LICENSE.md)