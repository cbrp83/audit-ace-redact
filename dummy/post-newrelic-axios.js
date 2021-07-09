const axios = require('axios');

const custom_log_record_str = JSON.stringify({
  message: 'nodejs request axios'
})

axios({
  method: 'POST',
  url: 'https://log-api.newrelic.com/log/v1',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Api-Key': 'NRII-uXdfB-7pdw7hnnocHlNNlBXcVH7Az2A2'
  },
  data: custom_log_record_str
}).then(function(response) {
  console.log(response.status);
  console.log(response.data);
}).catch(function(error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log(error.response.data);
    console.log(error.response.status);
    console.log(error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    // error.request is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.log(error.request);
    console.log('-------------------- error in request ---------------');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.log('Error', error.message);
  }
  console.log(error.config);
});