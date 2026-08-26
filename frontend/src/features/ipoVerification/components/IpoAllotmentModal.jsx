import React, { useState, useMemo, useEffect } from 'react';
import SModal from '../../../components/common/SModal';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import '../../../components/common/PermissionTree.css';
import './ipo.css';

const TreeNode = ({ node, selectedNodes, onToggle, expandedNodes, toggleExpand }) => {
  const isLeaf = !node.children || node.children.length === 0;
  const isExpanded = expandedNodes.has(node.id);

  let selectionState = 'unchecked';
  if (isLeaf) {
    selectionState = selectedNodes.has(node.id) ? 'checked' : 'unchecked';
  } else {
    const getLeafNodes = (n) => {
      if (!n.children || n.children.length === 0) return [n];
      return n.children.flatMap(getLeafNodes);
    };
    const leaves = getLeafNodes(node);
    const checkedCount = leaves.filter(l => selectedNodes.has(l.id)).length;
    if (checkedCount === leaves.length && leaves.length > 0) selectionState = 'checked';
    else if (checkedCount > 0) selectionState = 'indeterminate';
  }

  const handleToggle = () => {
    if (isLeaf) {
      onToggle([node.id], selectionState !== 'checked');
    } else {
      const getLeafNodes = (n) => {
        if (!n.children || n.children.length === 0) return [n];
        return n.children.flatMap(getLeafNodes);
      };
      const leaves = getLeafNodes(node).map(l => l.id);
      onToggle(leaves, selectionState !== 'checked');
    }
  };

  return (
    <div className="permission-tree-node">
      <div className="tree-node-header">
        <div 
          className="tree-node-toggle-icon" 
          onClick={() => !isLeaf && toggleExpand(node.id)}
          style={{ visibility: isLeaf ? 'hidden' : 'visible' }}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
        
        <div className="tree-node-checkbox" onClick={handleToggle} style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={selectionState === 'checked'}
            onChange={() => {}}
            ref={(input) => {
              if (input) input.indeterminate = selectionState === 'indeterminate';
            }}
            style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer', pointerEvents: 'none' }}
          />
        </div>
        
        <div className="tree-node-label" onClick={() => !isLeaf && toggleExpand(node.id)}>
          {node.label}
        </div>
      </div>
      
      {!isLeaf && isExpanded && (
        <div className="tree-node-children">
          {node.children.map(child => (
            <TreeNode 
              key={child.id}
              node={child}
              selectedNodes={selectedNodes}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const IpoAllotmentModal = ({ isOpen, onClose, onSubmit, ipo, applicants, loading, captchaState, onCaptchaSubmit }) => {
  const { t } = useTranslation();
  
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [captchaText, setCaptchaText] = useState('');

  // Clear captcha text when modal opens/closes or state changes
  useEffect(() => {
    if (!isOpen || !captchaState) {
      setCaptchaText('');
    }
  }, [isOpen, captchaState]);

  // Build the tree dynamically based on capability methods and applicants
  const tree = useMemo(() => {
    if (!ipo || !applicants) return [];

    const nodes = [];
    applicants.forEach(applicant => {
      const appNode = {
        id: `app_${applicant.id}`,
        label: applicant.name,
        children: []
      };

      if (applicant.identifiers) {
        Object.keys(applicant.identifiers).forEach(type => {
          const val = applicant.identifiers[type];
          if (val && typeof val === 'string' && val.trim() !== '') {
            appNode.children.push({
              id: `${applicant.id}::${type}::${val}`, // Format: applicantId::type::value
              label: `${type}: ${val}`,
              data: {
                applicantId: applicant.id,
                type,
                value: val
              }
            });
          }
        });
      }

      if (appNode.children.length > 0) {
        nodes.push(appNode);
      }
    });

    return nodes;
  }, [ipo, applicants]);

  useEffect(() => {
    if (isOpen) {
      setSelectedNodes(new Set());
      const initialExpanded = new Set();
      tree.forEach(app => {
        initialExpanded.add(app.id);
        app.children.forEach(type => initialExpanded.add(type.id));
      });
      setExpandedNodes(initialExpanded);
    }
  }, [isOpen, tree]);

  const toggleExpand = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggle = (ids, isChecked) => {
    setSelectedNodes(prev => {
      const next = new Set(prev);
      ids.forEach(id => {
        if (isChecked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleConfirm = () => {
    if (captchaState) {
      onCaptchaSubmit(captchaText);
      return;
    }
    const selections = [];
    selectedNodes.forEach(id => {
      const parts = id.split('::');
      if (parts.length === 3) {
        selections.push({
          applicantId: parts[0],
          type: parts[1],
          value: parts[2]
        });
      }
    });
    onSubmit(selections);
  };

  const isConfirmDisabled = loading || (!captchaState && selectedNodes.size === 0) || (captchaState && !captchaText);

  return (
    <SModal
      isOpen={isOpen}
      onClose={onClose}
      onCancel={onClose}
      onConfirm={handleConfirm}
      confirmDisabled={isConfirmDisabled}
      title={captchaState ? t('ipo.modal.captchaTitle', 'Security Check Required') : t('ipo.modal.title', 'Check IPO Allotment')}
      confirmText={loading ? t('ipo.modal.verifying', 'Verifying...') : t('ipo.modal.submit', 'Submit')}
      cancelText={t('common.cancel', 'Cancel')}
    >
      <div className="ipo-modal-content">
        <div style={{ marginBottom: '1rem' }}>
          <strong>{t('ipo.page.ipoName', 'IPO')}:</strong> {ipo?.name}
        </div>
        
        {captchaState ? (
          <div className="captcha-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{captchaState.message}</p>
            {captchaState.captchaImage && (
              <img src={captchaState.captchaImage} alt="CAPTCHA" style={{ border: '1px solid #ddd', borderRadius: '4px', maxWidth: '100%' }} />
            )}
            <input 
              type="text" 
              value={captchaText}
              onChange={(e) => setCaptchaText(e.target.value)}
              placeholder="Enter CAPTCHA here"
              style={{ padding: '0.5rem', width: '100%', maxWidth: '200px', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border)' }}
              autoFocus
            />
          </div>
        ) : tree.length === 0 ? (
          <div>{t('ipo.page.noIdentifiers', 'No identifiers found. Please add PAN/DPID to your applicants.')}</div>
        ) : (
          <div className="permission-tree-container" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
            {tree.map(node => (
              <TreeNode 
                key={node.id}
                node={node}
                selectedNodes={selectedNodes}
                onToggle={handleToggle}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
              />
            ))}
          </div>
        )}
      </div>
    </SModal>
  );
};

export default IpoAllotmentModal;
