import React from 'react';

export default function RuleCard({ rule, isModified, onToggle }) {
  const { ValidationName, Description, Active, Metadata } = rule;

  return (
    <div className={`glass-panel rule-card ${isModified ? 'modified' : ''}`}>
      <div className="rule-header">
        <h3 className="rule-title">{ValidationName.replace(/_/g, ' ')}</h3>
        <label className="switch">
          <input 
            type="checkbox" 
            checked={Active} 
            onChange={() => onToggle(rule.Id)} 
          />
          <span className="slider"></span>
        </label>
      </div>
      
      <p className="rule-desc">
        {Description || Metadata?.description || 'No description provided.'}
      </p>
      


      <div className="status-indicator" style={{ justifyContent: 'space-between' }}>
        <div>
          <span style={{ marginRight: '8px' }}>Status:</span>
          <span className={Active ? 'status-active' : 'status-inactive'}>
            {Active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        {isModified && (
          <span className="badge modified">Unsaved Changes</span>
        )}
      </div>
    </div>
  );
}
