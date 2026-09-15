import React, { useState, useEffect } from 'react';
import SButton from '@/components/common/SButton';
import SDropdown from '@/components/common/SDropdown';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import './TemplateBuilder.css';

const TemplateBuilder = ({ template, formFields, onSave, onCancel }) => {
  const [rows, setRows] = useState([]);
  const [selectedCol, setSelectedCol] = useState(null); // { rowIndex, colIndex, field }

  useEffect(() => {
    if (template && template.fields && template.fields.length > 0) {
      const maxRow = Math.max(...template.fields.map(f => f.row_number || 0));
      const initialRows = [];

      for (let r = 0; r <= maxRow; r++) {
        const fieldsInRow = template.fields.filter(f => (f.row_number || 0) === r);
        if (fieldsInRow.length > 0) {
          const maxCol = Math.max(...fieldsInRow.map(f => f.column_number || 0));
          const columns = [];
          for (let c = 0; c <= maxCol; c++) {
            const fieldsInCol = fieldsInRow
              .filter(f => (f.column_number || 0) === c)
              .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

            if (fieldsInCol.length > 0) {
              columns.push({
                id: `col-${r}-${c}-${Date.now()}`,
                fields: fieldsInCol.map(f => f.field_uuid),
                width: fieldsInCol[0].width || 12
              });
            }
          }
          if (columns.length > 0) {
            initialRows.push({
              id: `row-${r}-${Date.now()}`,
              columns
            });
          }
        }
      }
      setRows(initialRows);
    } else {
      setRows([{ id: `row-${Date.now()}`, columns: [] }]); // Start with 1 empty row
    }
  }, [template]);

  const handleAddRow = () => {
    setRows([...rows, { id: `row-${Date.now()}`, columns: [] }]);
  };

  const handleRemoveRow = (rowIndex) => {
    const newRows = [...rows];
    newRows.splice(rowIndex, 1);
    setRows(newRows);
    if (selectedCol && selectedCol.rowIndex === rowIndex) {
      setSelectedCol(null);
    }
  };

  const handleRemoveField = (rowIndex, colIndex, fieldIndex) => {
    const newRows = [...rows];
    newRows[rowIndex].columns[colIndex].fields.splice(fieldIndex, 1);
    setRows(newRows);
    if (selectedCol && selectedCol.rowIndex === rowIndex && selectedCol.colIndex === colIndex) {
      setSelectedCol(null);
    }
  };

  const handleSave = () => {
    let valid = true;
    const flatFields = [];

    rows.forEach((row, rIdx) => {
      let totalWidth = 0;
      row.columns.forEach((col, cIdx) => {
        totalWidth += parseInt(col.width || 12);
        if (col.fields && col.fields.length > 0) {
          col.fields.forEach((fieldUuid, fIdx) => {
            flatFields.push({
              field_uuid: fieldUuid,
              row_number: rIdx,
              column_number: cIdx,
              width: parseInt(col.width || 12),
              display_order: fIdx
            });
          });
        }
      });

      if (totalWidth > 12) {
        toast.error(`Row ${rIdx + 1} exceeds maximum grid width of 12 (Current: ${totalWidth})`);
        valid = false;
      }
    });

    if (valid) {
      onSave(flatFields);
    }
  };

  const handleDragStart = (e, fieldUuid, sourceRowIndex = null, sourceColIndex = null) => {
    e.dataTransfer.setData('fieldUuid', fieldUuid);
    e.dataTransfer.setData('sourceRow', sourceRowIndex !== null ? sourceRowIndex.toString() : '');
    e.dataTransfer.setData('sourceCol', sourceColIndex !== null ? sourceColIndex.toString() : '');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropToRow = (e, targetRowIndex) => {
    e.preventDefault();
    const fieldUuid = e.dataTransfer.getData('fieldUuid');
    const sourceRow = e.dataTransfer.getData('sourceRow');
    const sourceCol = e.dataTransfer.getData('sourceCol');

    if (!fieldUuid) return;

    const newRows = [...rows];

    if (sourceRow !== '' && sourceCol !== '') {
      const sR = parseInt(sourceRow);
      const sC = parseInt(sourceCol);
      const sF = e.dataTransfer.getData('sourceFieldIndex') !== '' ? parseInt(e.dataTransfer.getData('sourceFieldIndex')) : -1;

      if (sF !== -1) {
        newRows[sR].columns[sC].fields.splice(sF, 1);
      } else {
        newRows[sR].columns.splice(sC, 1);
      }

      if (selectedCol && selectedCol.rowIndex === sR && selectedCol.colIndex === sC) {
        setSelectedCol(null);
      }
    }

    const targetRow = newRows[targetRowIndex];
    const totalWidth = targetRow.columns.reduce((sum, col) => sum + parseInt(col.width || 0), 0);
    let defaultWidth = 6;
    if (totalWidth + defaultWidth > 12) defaultWidth = 12 - totalWidth;
    if (defaultWidth <= 0) defaultWidth = 6;

    targetRow.columns.push({
      id: `col-${Date.now()}`,
      fields: [fieldUuid],
      width: defaultWidth
    });

    setRows(newRows);
  };

  const handleAddColumn = (rowIndex) => {
    const newRows = [...rows];
    const targetRow = newRows[rowIndex];
    const totalWidth = targetRow.columns.reduce((sum, col) => sum + parseInt(col.width || 0), 0);
    let defaultWidth = 6;
    if (totalWidth + defaultWidth > 12) defaultWidth = 12 - totalWidth;
    if (defaultWidth <= 0) defaultWidth = 6;

    targetRow.columns.push({
      id: `col-${Date.now()}`,
      fields: [],
      width: defaultWidth
    });
    setRows(newRows);
  };

  const widthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `Span ${i + 1} / 12`,
    value: i + 1
  }));

  const handleWidthChange = (val) => {
    if (!selectedCol) return;
    const newRows = [...rows];
    newRows[selectedCol.rowIndex].columns[selectedCol.colIndex].width = parseInt(val);
    setRows(newRows);

    setSelectedCol({
      ...selectedCol,
      width: parseInt(val)
    });
  };

  return (
    <div className="template-builder-container">

      {/* Main Area: Grid Builder */}
      <div className="template-builder-main">
        <div className="template-builder-header">
          <div>
            <h2>Layout: {template?.name}</h2>
          </div>
          <div className="template-builder-header-actions">
            <SButton text="+ Add Row" color="secondary" onClick={handleAddRow} />
          </div>
        </div>

        <div className="template-builder-content">
          {rows.map((row, rowIndex) => {
            const rowWidth = row.columns.reduce((sum, col) => sum + parseInt(col.width || 0), 0);
            const isInvalid = rowWidth > 12;

            return (
              <div
                key={row.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropToRow(e, rowIndex)}
                className={`template-builder-row ${isInvalid ? 'invalid' : ''}`}
              >
                <div className="template-builder-row-header">
                  <span className="template-builder-row-title">
                    Row {rowIndex + 1}
                  </span>
                  <div className="template-builder-row-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <SButton size="s" text="Add Column" color="secondary" onClick={() => handleAddColumn(rowIndex)} />
                    <button
                      onClick={() => handleRemoveRow(rowIndex)}
                      title="Remove Row"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {row.columns.length === 0 ? (
                  <p className="template-builder-empty-row">Drop fields here</p>
                ) : (
                  <div className="template-builder-columns">
                    {row.columns.map((col, colIndex) => {
                      const flexBasis = `${(col.width / 12) * 100}%`;
                      const isSelected = selectedCol && selectedCol.rowIndex === rowIndex && selectedCol.colIndex === colIndex;

                      return (
                        <div
                          key={col.id}
                          onDragOver={handleDragOver}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const fieldUuid = e.dataTransfer.getData('fieldUuid');
                            if (!fieldUuid) return;
                            const newRows = [...rows];

                            // If coming from another column, remove it there first
                            const sourceRow = e.dataTransfer.getData('sourceRow');
                            const sourceCol = e.dataTransfer.getData('sourceCol');
                            const sourceFieldIdx = e.dataTransfer.getData('sourceFieldIndex');

                            if (sourceRow !== '' && sourceCol !== '' && sourceFieldIdx !== '') {
                              const sR = parseInt(sourceRow);
                              const sC = parseInt(sourceCol);
                              const sF = parseInt(sourceFieldIdx);
                              if (!(sR === rowIndex && sC === colIndex)) {
                                newRows[sR].columns[sC].fields.splice(sF, 1);
                              }
                            }

                            if (!newRows[rowIndex].columns[colIndex].fields) {
                              newRows[rowIndex].columns[colIndex].fields = [];
                            }
                            newRows[rowIndex].columns[colIndex].fields.push(fieldUuid);

                            setRows(newRows);
                          }}
                          className={`template-builder-col ${!col.fields || col.fields.length === 0 ? 'empty-col' : ''}`}
                          style={{ flex: `0 0 calc(${flexBasis} - ${((row.columns.length - 1) * 1) / row.columns.length}rem)` }}
                        >
                          <div className="template-builder-col-header" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="template-builder-col-width" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Column</span>
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                              <SButton
                                size="small"
                                color="secondary"
                                text="⚙️"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCol({ rowIndex, colIndex, width: col.width, isContainer: true });
                                }}
                                style={{ background: 'transparent', padding: '0', border: 'none', fontSize: '1.1rem' }}
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); const nr = [...rows]; nr[rowIndex].columns.splice(colIndex, 1); setRows(nr); if (selectedCol && selectedCol.rowIndex === rowIndex && selectedCol.colIndex === colIndex) setSelectedCol(null); }}
                                title="Remove Column"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', padding: '0.1rem' }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '3rem' }}>
                            {(!col.fields || col.fields.length === 0) ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Drop Fields Here</span>
                            ) : (
                              col.fields.map((fUuid, fIdx) => {
                                const field = formFields.find(f => f.uuid === fUuid);
                                return (
                                  <div
                                    key={`${fUuid}-${fIdx}`}
                                    draggable
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      handleDragStart(e, fUuid, rowIndex, colIndex);
                                      e.dataTransfer.setData('sourceFieldIndex', fIdx.toString());
                                    }}
                                    style={{ background: 'var(--surface)', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                  >
                                    <span style={{ fontSize: '0.9rem' }}>{field ? (field.label || field.field_name) : 'Unknown'}</span>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                      <SButton
                                        size="small"
                                        color="secondary"
                                        text="⚙️"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedCol({ rowIndex, colIndex, field, width: col.width, isContainer: false });
                                        }}
                                        style={{ background: 'transparent', padding: '0 0.25rem', fontSize: '1rem', border: 'none' }}
                                      />
                                      <SButton
                                        size="small"
                                        color="danger"
                                        text="&times;"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveField(rowIndex, colIndex, fIdx);
                                        }}
                                        style={{ background: 'transparent', padding: '0 0.25rem', fontSize: '1rem', color: 'var(--danger)', border: 'none' }}
                                      />
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        </div>

        {/* Footer: Cancel / Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
          <SButton text="Cancel" color="secondary" onClick={onCancel} />
          <SButton text="Save Layout" color="primary" onClick={handleSave} />
        </div>
      </div>

      {/* Sidebar: Available Fields or Config */}
      <div className="template-builder-sidebar">
        {selectedCol ? (
          <>
            <div className="template-builder-sidebar-header">
              <div>
                <h3>{selectedCol.isContainer ? 'Container Configuration' : 'Field Configuration'}</h3>
                {!selectedCol.isContainer && selectedCol.field && (
                  <p>{selectedCol.field.label}</p>
                )}
              </div>
              <SButton size="small" color="secondary" text="&times;" onClick={() => setSelectedCol(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '1.2rem', padding: '0 0.5rem' }} />
            </div>
            <div className="template-builder-sidebar-content">
              {!selectedCol.isContainer && selectedCol.field && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}><strong>Type:</strong> {selectedCol.field.field_type}</p>
                  <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}><strong>Name:</strong> {selectedCol.field.field_name}</p>
                </div>
              )}
              <SDropdown
                label="Container Width"
                value={selectedCol.width}
                options={widthOptions}
                onChange={handleWidthChange}
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                Change the width of this field. A full row is 12 columns wide.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="template-builder-sidebar-header">
              <div>
                <h3>Available Fields</h3>
                <p>Drag fields into the layout area.</p>
              </div>
            </div>

            <div className="template-builder-sidebar-content">
              {formFields.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No fields found!</p>
              ) : (
                formFields.map(f => (
                  <div
                    key={f.uuid}
                    draggable
                    onDragStart={(e) => handleDragStart(e, f.uuid)}
                    className="template-builder-field-item"
                  >
                    <span className="template-builder-field-icon">⠿</span>
                    {f.label || f.field_name}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default TemplateBuilder;
