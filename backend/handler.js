// handler.js (Lambda)d
const serverless = require('serverless-http');
const app = require('./app');

const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
});

module.exports.handler = async (event, context) => {
  try {
    const result = await handler(event, context);
    return result;
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
