import React, { useState, useEffect } from 'react';
import RuleCard from './RuleCard';

export default function Dashboard({ onLogout }) {
  const [rules, setRules] = useState([]);
  const [originalRules, setOriginalRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch('http://localhost:5000/api/validation-rules', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 401) {
          onLogout();
          return;
        }
        throw new Error('Failed to fetch rules');
      }
      const data = await response.json();
      setRules(data);
      setOriginalRules(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = (id) => {
    setRules(rules.map(rule => 
      rule.Id === id ? { ...rule, Active: !rule.Active } : rule
    ));
    setSuccessMsg(null);
  };

  const handleToggleAll = (activate) => {
    setRules(rules.map(rule => ({ ...rule, Active: activate })));
    setSuccessMsg(null);
  };

  const getModifiedRules = () => {
    return rules.filter((rule, index) => {
      const original = originalRules.find(o => o.Id === rule.Id);
      return original && original.Active !== rule.Active;
    });
  };

  const handleDeploy = async () => {
    const modifiedRules = getModifiedRules();
    if (modifiedRules.length === 0) return;

    setDeploying(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('http://localhost:5000/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ rules: modifiedRules }),
      });

      if (!response.ok) {
        if (response.status === 401) onLogout();
        throw new Error('Deployment failed');
      }

      const data = await response.json();
      
      const failures = data.results.filter(r => !r.success);
      if (failures.length > 0) {
        throw new Error(`Failed to deploy ${failures.length} rules. Check console for details.`);
      }

      setSuccessMsg(`Successfully deployed ${modifiedRules.length} changes!`);
      setOriginalRules(JSON.parse(JSON.stringify(rules)));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  };

  const modifiedCount = getModifiedRules().length;

  return (
    <div className="animate-fade-up">
      <div className="dashboard-header">
        <div>
          <h2>Validation Manager</h2>
          <p>Connected to Salesforce Developer Org</p>
        </div>
        <button onClick={onLogout} className="btn btn-glass">Logout</button>
      </div>

      <div className="dashboard-actions">
        <div className="actions-left">
          <button onClick={fetchRules} disabled={loading || deploying} className="btn btn-glass">
            {loading ? <div className="spinner"></div> : '🔄 Refresh Rules'}
          </button>
          
          <button onClick={() => handleToggleAll(true)} disabled={loading || deploying} className="btn btn-glass">
            Enable All
          </button>
          <button onClick={() => handleToggleAll(false)} disabled={loading || deploying} className="btn btn-glass">
            Disable All
          </button>
        </div>
        
        <div className="actions-right">
          {modifiedCount > 0 && (
            <span style={{ color: 'var(--sf-blue)', fontWeight: '600' }}>
              {modifiedCount} unsaved change{modifiedCount > 1 ? 's' : ''}
            </span>
          )}
          <button 
            onClick={handleDeploy} 
            disabled={modifiedCount === 0 || deploying || loading}
            className="btn btn-primary"
          >
            {deploying ? <div className="spinner"></div> : `🚀 Deploy Changes`}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.4)' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(16,185,129,0.4)' }}>
          {successMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
          <p style={{ marginTop: '1rem' }}>Loading Validation Rules...</p>
        </div>
      ) : rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--glass-bg)', borderRadius: '16px' }}>
          <p>No validation rules found on the Account object.</p>
        </div>
      ) : (
        <div className="rules-grid">
          {rules.map(rule => {
            const original = originalRules.find(o => o.Id === rule.Id);
            const isModified = original && original.Active !== rule.Active;
            
            return (
              <RuleCard 
                key={rule.Id} 
                rule={rule} 
                isModified={isModified}
                onToggle={handleToggle}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
