const serverless = require('serverless-http');
const app = require('../../server');

// serverless-http strips the /.netlify/functions/api prefix automatically
// so Express receives clean paths like /, /api/home, /anime/xxx etc.
const handler = serverless(app);

module.exports = { handler };
