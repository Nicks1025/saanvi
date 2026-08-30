import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './PermissionTree.css';

const TreeNode = ({ node, selectedUuids, onToggleNode, expandedNodes, toggleExpand }) => {
  const isLeaf = !node.children || Object.keys(node.children).length === 0;
  const isExpanded = expandedNodes.has(node.path);

  // Calculate selection state
  let selectionState = 'unchecked'; // 'checked', 'unchecked', 'indeterminate'
  
  if (isLeaf) {
    selectionState = selectedUuids.includes(node.uuid) ? 'checked' : 'unchecked';
  } else {
    // Check children
    const getLeafState = (n) => {
      if (!n.children || Object.keys(n.children).length === 0) {
        return { total: 1, checked: selectedUuids.includes(n.uuid) ? 1 : 0 };
      }
      return Object.values(n.children).reduce((acc, child) => {
        const childState = getLeafState(child);
        return {
          total: acc.total + childState.total,
          checked: acc.checked + childState.checked
        };
      }, { total: 0, checked: 0 });
    };
    
    const { total, checked } = getLeafState(node);
    if (total > 0) {
      if (checked === total) selectionState = 'checked';
      else if (checked > 0) selectionState = 'indeterminate';
    }
  }

  const handleToggle = () => {
    // If it's a leaf, toggle it
    if (isLeaf) {
      onToggleNode([node.uuid], selectionState !== 'checked');
    } else {
      // If it's a parent, toggle all descendant leaves
      const getAllLeafUuids = (n) => {
        if (!n.children || Object.keys(n.children).length === 0) return [n.uuid];
        return Object.values(n.children).flatMap(getAllLeafUuids);
      };
      const leafUuids = getAllLeafUuids(node);
      onToggleNode(leafUuids, selectionState !== 'checked');
    }
  };

  return (
    <div className="permission-tree-node">
      <div className="tree-node-header">
        <div 
          className="tree-node-toggle-icon" 
          onClick={() => !isLeaf && toggleExpand(node.path)}
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
              if (input) {
                input.indeterminate = selectionState === 'indeterminate';
              }
            }}
            style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer', pointerEvents: 'none' }}
          />
        </div>
        
        <div className="tree-node-label" onClick={() => !isLeaf && toggleExpand(node.path)}>
          {node.label}
          {node.name && node.name !== node.label && <span className="tree-node-desc"> - {node.name}</span>}
        </div>
      </div>
      
      {!isLeaf && isExpanded && (
        <div className="tree-node-children">
          {Object.values(node.children).map(childNode => (
            <TreeNode 
              key={childNode.path} 
              node={childNode} 
              selectedUuids={selectedUuids}
              onToggleNode={onToggleNode}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PermissionTree = ({ permissions, selectedPermissions, onChange }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root'])); // By default root is expanded conceptually

  // Build the tree
  const tree = useMemo(() => {
    const root = { children: {}, path: 'root', label: 'All Permissions' };

    // Filter permissions by search
    const filteredPermissions = permissions.filter(p => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return p.permission.toLowerCase().includes(lowerQuery) || 
             (p.name && p.name.toLowerCase().includes(lowerQuery)) ||
             (p.description && p.description.toLowerCase().includes(lowerQuery));
    });

    filteredPermissions.forEach(p => {
      const parts = p.permission.split('.');
      let current = root;
      
      parts.forEach((part, index) => {
        const isLeaf = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('.');
        
        if (!current.children[part]) {
          current.children[part] = {
            label: part.charAt(0).toUpperCase() + part.slice(1),
            path: currentPath,
            children: {}
          };
        }
        
        if (isLeaf) {
          // It's the actual permission
          current.children[part].uuid = p.uuid;
          current.children[part].name = p.name;
          current.children[part].description = p.description;
        }
        
        current = current.children[part];
      });
    });

    // Auto-expand nodes that match search
    if (searchQuery) {
      const newExpanded = new Set(['root']);
      const expandAll = (node) => {
        newExpanded.add(node.path);
        Object.values(node.children || {}).forEach(expandAll);
      };
      expandAll(root);
      setExpandedNodes(newExpanded);
    }

    return root;
  }, [permissions, searchQuery]);

  const totalExpandableNodes = useMemo(() => {
    let count = 0;
    const countNodes = (node) => {
      if (node.children && Object.keys(node.children).length > 0) {
        count++;
        Object.values(node.children).forEach(countNodes);
      }
    };
    countNodes(tree);
    return count;
  }, [tree]);

  const handleExpandAll = () => {
    const newExpanded = new Set(['root']);
    const expandAll = (node) => {
      newExpanded.add(node.path);
      Object.values(node.children || {}).forEach(expandAll);
    };
    expandAll(tree);
    setExpandedNodes(newExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  const isAllExpanded = expandedNodes.size >= totalExpandableNodes && totalExpandableNodes > 0;
  const isAllCollapsed = expandedNodes.size <= 1;

  const toggleExpand = (path) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleToggleNode = (uuids, isChecked) => {
    let nextSelected = [...selectedPermissions];
    if (isChecked) {
      uuids.forEach(u => {
        if (!nextSelected.includes(u)) nextSelected.push(u);
        
        // Auto-select view permission if an action permission is selected
        const perm = permissions.find(p => p.uuid === u);
        if (perm && perm.permission) {
          const parts = perm.permission.split('.');
          if (parts.length >= 2 && ['create', 'edit', 'archive', 'delete'].includes(parts[parts.length - 1])) {
            const viewPermString = [...parts.slice(0, parts.length - 1), 'view'].join('.');
            const viewPerm = permissions.find(p => p.permission === viewPermString);
            if (viewPerm && !nextSelected.includes(viewPerm.uuid)) {
              nextSelected.push(viewPerm.uuid);
            }
          }
        }
      });
    } else {
      let filteredNext = nextSelected.filter(u => !uuids.includes(u));
      
      // Prevent unselecting 'view' if any related action is still selected
      uuids.forEach(u => {
        const perm = permissions.find(p => p.uuid === u);
        if (perm && perm.permission && perm.permission.endsWith('.view')) {
          const prefix = perm.permission.substring(0, perm.permission.lastIndexOf('.view'));
          const hasRelatedAction = filteredNext.some(selectedId => {
            const selectedPerm = permissions.find(p => p.uuid === selectedId);
            return selectedPerm && 
                   selectedPerm.permission.startsWith(prefix + '.') && 
                   selectedPerm.permission !== perm.permission;
          });
          
          if (hasRelatedAction) {
            // Keep the view permission if a related action is still selected
            if (!filteredNext.includes(u)) {
              filteredNext.push(u);
            }
          }
        }
      });
      nextSelected = filteredNext;
    }
    onChange(nextSelected);
  };

  return (
    <div className="permission-tree-container">
      <div className="permission-tree-search">
        <Search size={16} className="search-icon" />
        <input 
          type="text" 
          placeholder={t('admin.searchPermissions', 'Search permissions...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
        <span 
          onClick={handleExpandAll}
          style={{ cursor: 'pointer', color: isAllExpanded ? 'var(--accent)' : 'var(--text)', transition: 'color 0.2s' }}
        >
          {t('admin.expandAll', 'Expand All')}
        </span>
        <span 
          onClick={handleCollapseAll}
          style={{ cursor: 'pointer', color: isAllCollapsed ? 'var(--accent)' : 'var(--text)', transition: 'color 0.2s' }}
        >
          {t('admin.collapseAll', 'Collapse All')}
        </span>
      </div>
      
      <div className="permission-tree-content">
        {Object.values(tree.children).length === 0 ? (
          <div className="no-permissions-found">No permissions found matching '{searchQuery}'</div>
        ) : (
          Object.values(tree.children).map(node => (
            <TreeNode 
              key={node.path}
              node={node}
              selectedUuids={selectedPermissions}
              onToggleNode={handleToggleNode}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default PermissionTree;
