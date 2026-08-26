import React, { useState } from 'react';
import './ipo.css';

const TreeNode = ({ label, value, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isObject = typeof value === 'object' && value !== null;

  return (
    <div className="ipo-tree-node">
      <div 
        className={`ipo-tree-label ${isObject ? 'clickable' : ''}`}
        onClick={() => isObject && setExpanded(!expanded)}
      >
        {isObject && (
          <span className="ipo-tree-toggle">
            {expanded ? '▼' : '▶'}
          </span>
        )}
        <strong>{label}:</strong> {!isObject && <span className="ipo-tree-value">{String(value)}</span>}
      </div>
      {isObject && expanded && (
        <div className="ipo-tree-children">
          {Object.entries(value).map(([k, v]) => (
            <TreeNode key={k} label={k} value={v} />
          ))}
        </div>
      )}
    </div>
  );
};

const IpoResultTree = ({ result }) => {
  if (!result) return null;

  return (
    <div className="ipo-result-tree-container">
      <h3>Allotment Details</h3>
      <div className={`ipo-result-status status-${result.status?.toLowerCase()}`}>
        {result.status}
      </div>
      
      {result.error_category && (
        <div className="ipo-result-error">
          <strong>Error:</strong> {result.error_category}
        </div>
      )}
      
      <div className="ipo-tree-root">
        <TreeNode label="Raw Payload" value={result} />
      </div>
    </div>
  );
};

export default IpoResultTree;
