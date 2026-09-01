import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Play, Loader2, Send, Info } from 'lucide-react';
import EmailEditor from 'react-email-editor';
import STextField from '../../../components/common/STextField';
import SDropdown from '../../../components/common/SDropdown';
import SButton from '../../../components/common/SButton';
import SModal from '../../../components/common/SModal';
import STooltip from '../../../components/common/STooltip';
import { getEmailTemplate, createEmailTemplate, updateEmailTemplate, previewEmailTemplate, testEmailTemplate, getEmailTemplateTableColumns } from './communicationService';
import axios from '../../../services/axios.client';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' }
];

const EDITOR_MODE_OPTIONS = [
  { value: 'VISUAL', label: 'Visual Builder' },
  { value: 'HTML', label: 'Advanced HTML' }
];

// Regex to extract dynamic variables like {{$$any content$$}}
const extractDynamicVariables = (text) => {
  if (!text) return [];
  const regex = /\{\{\s*\$\$(.+?)\$\$\s*\}\}/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1].trim());
  }
  return Array.from(matches);
};

// Regex to extract column variables like {{column_name}}
const extractColumnVariables = (text) => {
  if (!text) return [];
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
};

const getResponsiveHtml = (html) => {
  if (!html) return '';
  const responsiveStyle = `
    <style>
      body { margin: 0; padding: 0; overflow-x: hidden; }
      table { max-width: 100% !important; }
      img { max-width: 100% !important; height: auto !important; }
      .u-row { width: 100% !important; max-width: 100% !important; }
    </style>
  `;
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${responsiveStyle}`);
  }
  return `${responsiveStyle}${html}`;
};

const EmailTemplateEditor = ({ templateUuid, isViewing = false, onClose }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [activeRightTab, setActiveRightTab] = useState('VARIABLES');
  const [dynamicVariables, setDynamicVariables] = useState([]);
  const [userVariables, setUserVariables] = useState([]);
  const [selectedDynVar, setSelectedDynVar] = useState('');
  const [selectedTableColumnDrop, setSelectedTableColumnDrop] = useState('');
  const [selectedDynamicVarDrop, setSelectedDynamicVarDrop] = useState('');
  
  const emailEditorRef = useRef(null);
  const htmlTextareaRef = useRef(null);

  const [form, setForm] = useState({
    template_key: '',
    name: '',
    description: '',
    subject: '',
    html_body: '',
    plain_text_body: '',
    status: 'ACTIVE',
    available_variables: '',
    editor_mode: 'VISUAL',
    design_json: null,
    linked_table: ''
  });

  const [tableColumns, setTableColumns] = useState([]); // columns from the linked table
  const [loadingColumns, setLoadingColumns] = useState(false);

  const [previewData, setPreviewData] = useState(null);
  const [previewVars, setPreviewVars] = useState('{}');
  
  const [customHtml, setCustomHtml] = useState('');
  const [visualHtml, setVisualHtml] = useState('');

  useEffect(() => {
    fetchDynamicVariables();
    fetchUserVariables();
    if (templateUuid) {
      fetchTemplate();
    }
  }, [templateUuid]);

  const fetchDynamicVariables = async () => {
    try {
      const res = await axios.get('/api/admin/dynamic-variables');
      setDynamicVariables(res || []);
    } catch (err) {
      console.error('Failed to load dynamic variables', err);
    }
  };

  const fetchUserVariables = async () => {
    // Kept for backward compat — if template_key matches user_account_created we can still show user dynamic vars
    try {
      const res = await axios.get('/api/admin/users/fields');
      if (res && res.data) {
        const userVars = res.data
          .filter(f => f.field_name !== 'password')
          .map(f => ({
            variable_name: f.field_name,
            label: f.label || f.field_name,
            description: `User's ${f.label || f.field_name}`
          }));
        setUserVariables(userVars);
      }
    } catch (err) {
      console.error('Failed to load user fields', err);
    }
  };

  const fetchTableColumns = async (tableName) => {
    if (!tableName) { setTableColumns([]); return; }
    setLoadingColumns(true);
    try {
      const columns = await getEmailTemplateTableColumns(tableName);
      setTableColumns(Array.isArray(columns) ? columns : []);
    } catch (err) {
      toast.error(`Could not load columns for table '${tableName}'`);
      setTableColumns([]);
    } finally {
      setLoadingColumns(false);
    }
  };

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const data = await getEmailTemplate(templateUuid);
      let varsStr = '';
      if (Array.isArray(data.available_variables)) {
        varsStr = data.available_variables.join(', ');
      } else if (typeof data.available_variables === 'string' && data.available_variables.trim()) {
        try {
          const parsed = JSON.parse(data.available_variables);
          varsStr = Array.isArray(parsed) ? parsed.join(', ') : '';
        } catch (e) {
          varsStr = data.available_variables;
        }
      }
      
      let parsedDesign = null;
      if (data.design_json) {
        try {
          parsedDesign = typeof data.design_json === 'string' ? JSON.parse(data.design_json) : data.design_json;
        } catch (e) {
          console.error("Failed to parse design_json", e);
        }
      }
      
      setForm({
        ...data,
        available_variables: varsStr,
        editor_mode: data.editor_mode || 'VISUAL',
        design_json: parsedDesign,
        linked_table: data.linked_table || ''
      });
      // Load columns for the linked table if set
      if (data.linked_table) {
        fetchTableColumns(data.linked_table);
      }
      if (data.editor_mode === 'HTML') {
        setCustomHtml(data.html_body || '');
      } else {
        setVisualHtml(data.html_body || '');
      }
    } catch (err) {
      toast.error('Failed to load template');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const onLoad = () => {
    if (emailEditorRef.current && emailEditorRef.current.editor) {
      const exportAndUpdate = () => {
        emailEditorRef.current.editor.exportHtml((data) => {
          setVisualHtml(data.html);
          setForm(prev => ({ ...prev, design_json: data.design }));
        });
      };

      if (form.design_json) {
        emailEditorRef.current.editor.loadDesign(form.design_json);
      } else {
        // If it's a completely new template, just export the blank state immediately
        exportAndUpdate();
      }
      
      // Force a sync immediately when the visual design finishes loading
      emailEditorRef.current.editor.addEventListener('design:loaded', exportAndUpdate);
      
      // Keep syncing on every visual change
      emailEditorRef.current.editor.addEventListener('design:updated', exportAndUpdate);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.template_key || !form.name || !form.subject) {
      toast.error('Template key, name, and subject are required');
      return;
    }

    if (form.editor_mode === 'HTML' && !customHtml) {
      toast.error('HTML body is required');
      return;
    }

    setSaving(true);

    try {
      let finalHtml = customHtml;
      let finalDesign = form.design_json;

      if (form.editor_mode === 'VISUAL' && emailEditorRef.current?.editor) {
        // Export HTML and Design from Unlayer
        const exportData = await new Promise((resolve) => {
          emailEditorRef.current.editor.exportHtml((data) => {
            resolve(data);
          });
        });
        finalHtml = exportData.html;
        finalDesign = exportData.design;
      }

      // Auto-detect variables from HTML and Subject
      const extractedVars = new Set([
        ...extractDynamicVariables(form.subject),
        ...extractDynamicVariables(finalHtml),
        ...extractColumnVariables(form.subject),
        ...extractColumnVariables(finalHtml)
      ]);

      const allVars = Array.from(extractedVars);

      const payload = {
        ...form,
        html_body: finalHtml,
        design_json: finalDesign,
        available_variables: allVars
      };

      if (templateUuid) {
        await updateEmailTemplate(templateUuid, payload);
        toast.success('Template updated successfully');
      } else {
        await createEmailTemplate(payload);
        toast.success('Template created successfully');
      }
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    // We do instantaneous live preview locally
    let finalHtml = form.editor_mode === 'VISUAL' ? visualHtml : customHtml;
    
    if (!finalHtml) {
      setPreviewData(null);
      return;
    }

    let parsedVars = {};
    try {
      parsedVars = JSON.parse(previewVars);
    } catch (e) {
      // Don't crash live preview on intermediate typing
    }

    const replaceVarsLocal = (str, varsObj) => {
      if (!str) return '';
      let result = str;
      result = result.replace(/\{\{\s*\$\$(.+?)\$\$\s*\}\}/g, (match, p1) => {
        const key = p1.trim();
        return varsObj[key] !== undefined ? varsObj[key] : match;
      });
      result = result.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, p1) => {
        return varsObj[p1] !== undefined ? varsObj[p1] : match;
      });
      return result;
    };

    setPreviewData({
      subject: replaceVarsLocal(form.subject || 'No Subject', parsedVars),
      html_body: getResponsiveHtml(replaceVarsLocal(finalHtml, parsedVars))
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handlePreview();
    }, 300);
    return () => clearTimeout(timer);
  }, [visualHtml, customHtml, form.editor_mode, form.subject, previewVars]);

  // Derived list of all extracted variables for the variables tab
  const currentHtml = form.editor_mode === 'VISUAL' ? visualHtml : customHtml;
  const allExtractedVars = Array.from(new Set([
    ...extractDynamicVariables(form.subject),
    ...extractDynamicVariables(currentHtml),
    ...extractColumnVariables(form.subject),
    ...extractColumnVariables(currentHtml),
    ...(form.available_variables ? form.available_variables.split(',').map(v => v.trim()).filter(Boolean) : [])
  ]));

  const updatePreviewVar = (key, value) => {
    try {
      const parsed = JSON.parse(previewVars);
      parsed[key] = value;
      setPreviewVars(JSON.stringify(parsed, null, 2));
    } catch (e) {
      // Fallback if JSON is broken
    }
  };

  const getPreviewVarValue = (key) => {
    try {
      const parsed = JSON.parse(previewVars);
      return parsed[key] || '';
    } catch (e) {
      return '';
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    let parsedVars = {};
    try {
      parsedVars = JSON.parse(previewVars);
    } catch (e) {
      toast.error('Invalid JSON for Test Variables');
      return;
    }

    setTesting(true);
    try {
      await testEmailTemplate(templateUuid, {
        recipient_email: testEmail,
        test_variables: parsedVars
      });
      toast.success('Test email queued successfully');
      setShowTestModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="spinner" size={24} /></div>;
  }

  return (
    <div className="page-container" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'space-between' }}>
          <button 
            onClick={() => onClose()}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}
          >
            <ArrowLeft size={18} /> {t('common.back', 'Back')}
          </button>
          
          {templateUuid && !isViewing && (
            <SButton 
              onClick={() => setShowTestModal(true)} 
              icon={<Send size={16} />} 
              style={{ background: 'var(--accent-hover)', color: 'white', border: 'none' }}
            >
              Send Test Email
            </SButton>
          )}
        </div>
        
        <div style={{ backgroundColor: 'var(--bg)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-h)' }}>
            {isViewing ? 'View Template' : templateUuid ? 'Edit Template' : 'Create Template'}
          </h2>

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <STextField
                label="Template Key *"
                text={form.template_key}
                onChange={(e) => handleChange('template_key', e.target.value)}
                disabled={!!templateUuid || isViewing}
                placeholder="e.g. USER_WELCOME"
              />
              <STextField
                label="Template Name *"
                text={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Welcome Email"
                disabled={isViewing}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <STextField
                label="Email Subject *"
                text={form.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                disabled={isViewing}
              />
              <SDropdown
                label="Editor Mode"
                value={form.editor_mode}
                options={EDITOR_MODE_OPTIONS}
                onChange={(val) => {
                  handleChange('editor_mode', val);
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <STextField
                label="Description"
                text={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={isViewing}
              />
            </div>

            <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border)', opacity: 0.5 }} />

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-h)' }}>
                Email Body *
              </label>
              
              {form.editor_mode === 'VISUAL' ? (
                <div style={{ border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <EmailEditor 
                    ref={emailEditorRef} 
                    onLoad={onLoad} 
                    minHeight="500px"
                    options={{
                      mergeTags: Object.fromEntries(
                        tableColumns.map(col => [col, { name: col, value: `{{${col}}}` }])
                      )
                    }}
                  />
                </div>
              ) : (
                <textarea
                  className="s-input"
                  ref={htmlTextareaRef}
                  value={customHtml}
                  onChange={(e) => setCustomHtml(e.target.value)}
                  disabled={isViewing}
                  style={{ width: '100%', minHeight: '300px', padding: '0.75rem', fontFamily: 'monospace' }}
                  placeholder="<p>Write your HTML here...</p>"
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <SButton type="button" text="Cancel" onClick={() => onClose()} style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
              {!isViewing && (
                <SButton type="submit" color="primary" text={saving ? 'Saving...' : 'Save Template'} disabled={saving} icon={<Save size={16} />} />
              )}
            </div>
          </form>
        </div>
      </div>

      <div style={{ width: '450px', flexShrink: 0, position: 'sticky', top: '2rem' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
          <button 
            type="button"
            onClick={() => setActiveRightTab('VARIABLES')}
            style={{ flex: 1, padding: '0.75rem 1rem', background: activeRightTab === 'VARIABLES' ? 'var(--bg-hover)' : 'transparent', border: 'none', borderBottom: activeRightTab === 'VARIABLES' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', color: 'var(--text-h)', fontWeight: 600 }}
          >Variables</button>
          <button 
            type="button"
            onClick={() => setActiveRightTab('PREVIEW')}
            style={{ flex: 1, padding: '0.75rem 1rem', background: activeRightTab === 'PREVIEW' ? 'var(--bg-hover)' : 'transparent', border: 'none', borderBottom: activeRightTab === 'PREVIEW' ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', color: 'var(--text-h)', fontWeight: 600 }}
          >Live Preview</button>
        </div>

        {activeRightTab === 'VARIABLES' && (
          <div style={{ backgroundColor: 'var(--bg)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)', marginBottom: '1rem' }}>

            {/* Linked Data Table section */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>Linked Data Table</p>
                <STooltip content={<span>{t('email_templates.linked_table_tooltip_1', 'Link a database table to expose its columns as')} <code>{`{{column_name}}`}</code> {t('email_templates.linked_table_tooltip_2', "variables. The row is resolved using the recipient's email.")}</span>} position="left" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Table Name</label>
                <input
                  type="text"
                  className="s-input"
                  value={form.template_key?.toUpperCase() === 'USER_ACCOUNT_CREATED' ? 'user_details' : (form.linked_table || '')}
                  disabled={isViewing || form.template_key?.toUpperCase() === 'USER_ACCOUNT_CREATED'}
                  onChange={(e) => handleChange('linked_table', e.target.value)}
                  onBlur={(e) => fetchTableColumns(e.target.value.trim())}
                  placeholder="e.g. user_details"
                  style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                />
              </div>
              {loadingColumns && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Loading columns...</p>}
              {tableColumns.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Available Columns (Select to copy):</p>
                  <SDropdown 
                    label=""
                    value={selectedTableColumnDrop}
                    onChange={(val) => {
                      if (!val) return;
                      setSelectedTableColumnDrop(val);
                      navigator.clipboard.writeText(`{{${val}}}`);
                      toast.success(`Copied {{${val}}} to clipboard`);
                    }}
                    options={[
                      { label: 'Select a column...', value: '' },
                      ...tableColumns.map(col => ({ label: `{{${col}}}`, value: col }))
                    ]}
                    searchable={true}
                    disabled={isViewing}
                  />
                </div>
              )}
            </div>

            {/* Dynamic variables from the variable system */}
            <div style={{ marginBottom: '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>Dynamic Variables</p>
                <STooltip content={<span>{t('email_templates.use', 'Use')} <code>{`{{$$variable name$$}}`}</code> — {t('email_templates.dynamic_vars_tooltip', 'resolved at send time from the Dynamic Variables system.')}</span>} position="left" />
              </div>
              {dynamicVariables.length > 0 ? (
                <SDropdown 
                  label=""
                  value={selectedDynamicVarDrop}
                  onChange={(val) => {
                    if (!val) return;
                    setSelectedDynamicVarDrop(val);
                    navigator.clipboard.writeText(`{{${val}}}`);
                    toast.success(`Copied {{${val}}} to clipboard`);
                  }}
                  options={[
                    { label: 'Select a dynamic variable...', value: '' },
                    ...dynamicVariables.map(v => ({ label: `{{${v.variable_name}}} - ${v.label || v.variable_name}`, value: v.variable_name }))
                  ]}
                  searchable={true}
                  disabled={isViewing}
                />
              ) : (
                <div style={{ padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  No dynamic variables configured. Add them in the Dynamic Variables section.
                </div>
              )}
            </div>
          </div>
        )}

        {activeRightTab === 'PREVIEW' && (
          <div style={{ backgroundColor: 'var(--bg)', borderRadius: '8px', padding: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: '0', fontSize: '1.1rem', color: 'var(--text-h)' }}>Live Preview</h3>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: '4px' }}>Auto-updating</span>
            </div>

            {previewData ? (
              <div style={{ border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)' }}>
                  <strong>Subject:</strong> {previewData.subject || <span style={{ color: 'var(--text-secondary)' }}>No subject</span>}
                </div>
                <iframe 
                  srcDoc={previewData.html_body}
                  title="Email Preview"
                  style={{ width: '100%', height: '500px', border: 'none', backgroundColor: '#ffffff', display: 'block' }}
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border)', borderRadius: '4px' }}>
                Fill out HTML to see preview.
              </div>
            )}
          </div>
        )}
      </div>

      {showTestModal && (
        <SModal 
          isOpen={true} 
          onCancel={() => setShowTestModal(false)} 
          onConfirm={handleSendTestEmail}
          confirmText={testing ? 'Sending...' : 'Send Email'}
          isProcessing={testing}
          title="Send Test Email"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <STextField 
              label="Recipient Email" 
              text={testEmail} 
              onChange={(e) => setTestEmail(e.target.value)} 
              placeholder="admin@saanviworld.com"
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Variables will be automatically resolved at send time from the linked data table and dynamic variables system.
            </p>
          </div>
        </SModal>
      )}
    </div>
  );
};

export default EmailTemplateEditor;
