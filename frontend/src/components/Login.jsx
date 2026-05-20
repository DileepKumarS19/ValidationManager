import React from 'react';

export default function Login() {
  return (
    <div className="login-screen animate-fade-up">
      <div className="glass-panel login-card">
        <div className="sf-cloud">☁️</div>
        <h1>Validation Manager</h1>
        <p style={{ marginBottom: '2rem' }}>
          Connect your Salesforce Developer Org to instantly view, manage, and deploy Account validation rules from a beautiful interface.
        </p>
        <a href={`${import.meta.env.VITE_BACKEND_URL}/auth/login`} className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
          Connect to Salesforce
        </a>
      </div>
    </div>
  );
}
