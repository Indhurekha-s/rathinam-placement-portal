// Vercel Serverless Function Entrypoint
// Routes all /api/* calls directly into the Express application
const app = require('../backend/server');

module.exports = app;
