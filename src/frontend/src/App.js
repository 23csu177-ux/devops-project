import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

const APP_VERSION = process.env.REACT_APP_VERSION || '1.0.0';
const ENVIRONMENT = process.env.REACT_APP_ENV || 'development';

function Home() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>DevOps CI/CD Demo Application</h1>
      <div style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <p><strong>App Version:</strong> {APP_VERSION}</p>
        <p><strong>Environment:</strong> {ENVIRONMENT}</p>
        <p><strong>Status:</strong> Running</p>
      </div>
      <div style={{ marginTop: '20px', color: '#666' }}>
        <p>This application demonstrates a production-grade CI/CD pipeline using GitHub Actions.</p>
      </div>
    </div>
  );
}

function Health() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px' }}>
      <h2>Health Check</h2>
      <pre>{JSON.stringify({ status: 'ok', version: APP_VERSION, environment: ENVIRONMENT }, null, 2)}</pre>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/health" element={<Health />} />
    </Routes>
  );
}

export default App;
