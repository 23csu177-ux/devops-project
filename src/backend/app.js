const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

function readVersion(versionPath) {
  try {
    return fs.readFileSync(versionPath, 'utf8').trim();
  } catch (err) {
    console.warn('Could not read version.txt, using default version');
    return '0.0.0';
  }
}

function createApp(options) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const versionPath = (options && options.versionPath)
    ? options.versionPath
    : path.join(__dirname, '..', '..', 'version.txt');

  const version = readVersion(versionPath);

  app.get('/', (req, res) => {
    res.json({
      message: 'Hello',
      version: version,
      env: process.env.NODE_ENV || 'development'
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/version', (req, res) => {
    res.json({ version: version });
  });

  return app;
}

module.exports = { createApp, readVersion };
