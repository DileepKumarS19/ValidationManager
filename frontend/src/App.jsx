import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      
      if (urlToken) {
        localStorage.setItem('sf_token', urlToken);
        window.history.replaceState({}, document.title, '/');
      }

      const token = localStorage.getItem('sf_token');
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setIsAuthenticated(data.loggedIn);
    } catch (err) {
      console.error('Failed to check auth status', err);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('sf_token');
      if (token) {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/logout`, { 
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      localStorage.removeItem('sf_token');
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: '50px', height: '50px' }}></div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
