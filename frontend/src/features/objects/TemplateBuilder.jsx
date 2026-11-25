import React from 'react';
import SButton from '@/components/common/SButton';
import SDropdown from '@/components/common/SDropdown';
import SIcon from '@/components/common/SIcon';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTemplateBuilder } from './useTemplateBuilder';
import './TemplateBuilder.css';

const WIDTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: `${i + 1}`,
  value: i + 1,
}));

const TemplateBuilder = ({ template, formFields, onSave, onCancel }) => {
  const {
    rows,
    selectedCol,
    tempWidth,
    setTempWidth,
    isPanelExpanded,
    setIsPanelExpanded,
    availableFields,
    addRow,
    removeRow,
    addColumn,
    removeColumn,
    removeField,
    handleDragStart,
    handleDragOver,
    handleDropToRow,
    handleDropToColumn,
    handleDropOnField,
    openContainerConfig,
    saveContainerConfig,
    cancelContainerConfig,
    saveLayout,
  } = useTemplateBuilder(template, formFields, onSave);

  return (
    <div className="template-builder-container">
      {/* Main Canvas Area */}
      <div className="template-builder-main">
        <div className="template-builder-header">
          <div>
            <h2>Template Builder</h2>
            <p>Design your form layout by dragging fields into columns</p>
          </div>
          <div className="template-builder-header-actions">
            <SButton text="+ Add Row" color="secondary" onClick={addRow} />
          </div>
        </div>

        {/* Rows Canvas */}
        <div className="template-builder-content">
          {rows.map((row, rowIndex) => (
            <div
              key={row.id}
              className="template-builder-row"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropToRow(e, rowIndex)}
            >
              <div className="template-builder-row-header">
                <span className="template-builder-row-title">Row {rowIndex + 1}</span>
                <div className="template-builder-row-actions">
                  <SButton size="s" text="+ Add Column" color="primary" onClick={() => addColumn(rowIndex)} />
                  <button
                    onClick={() => removeRow(rowIndex)}
                    title="Remove Row"
                    className="template-builder-remove-btn"
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
                    const isSelected =
                      selectedCol &&
                      selectedCol.rowIndex === rowIndex &&
                      selectedCol.colIndex === colIndex;

                    return (
                      <div
                        key={col.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropToColumn(e, rowIndex, colIndex)}
                        className={`template-builder-col ${!col.fields || col.fields.length === 0 ? 'empty-col' : ''} ${isSelected ? 'selected' : ''}`}
                        style={{ flex: `0 0 calc(${flexBasis} - ${((row.columns.length - 1) * 1) / row.columns.length}rem)` }}
                      >
                        <div className="template-builder-col-header">
                          <span className="template-builder-col-width">Column</span>
                          <div className="template-builder-col-actions">
                            <SIcon
                              name="settings"
                              size={14}
                              color="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                openContainerConfig(rowIndex, colIndex, col.width);
                              }}
                              title="Configure Column"
                              aria-label="Configure Column"
                              className="template-builder-config-btn"
                              subtle
                            />
                            <SIcon
                              name="x"
                              size={14}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeColumn(rowIndex, colIndex);
                              }}
                              title="Remove Column"
                              aria-label="Remove Column"
                              className="template-builder-remove-btn"
                              subtle
                            />
                          </div>
                        </div>

                        <div className="template-builder-col-fields">
                          {!col.fields || col.fields.length === 0 ? (
                            <span className="template-builder-drop-hint">Drop Fields Here</span>
                          ) : (
                            col.fields.map((placement, fIdx) => {
                              const fUuid = typeof placement === 'object' ? placement.fieldUuid : placement;
                              const pUuid = typeof placement === 'object' ? placement.placementUuid : `${fUuid}-${fIdx}`;
                              const field = formFields.find((f) => f.uuid === fUuid);
                              return (
                                <div
                                  key={pUuid}
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    handleDragStart(e, fUuid, rowIndex, colIndex, pUuid);
                                    e.dataTransfer.setData('sourceFieldIndex', fIdx.toString());
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDrop={(e) => handleDropOnField(e, rowIndex, colIndex, fIdx)}
                                  className="template-builder-field-card"
                                >
                                  <span>{field?.label || ''}</span>
                                  <SIcon
                                    name="x"
                                    size={14}
                                    color="danger"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeField(rowIndex, colIndex, fIdx);
                                    }}
                                    title="Remove Field"
                                    aria-label="Remove Field"
                                    className="template-builder-delete-field-btn"
                                    subtle
                                  />
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="template-builder-footer">
          <SButton text="Cancel" color="secondary" onClick={onCancel} />
          <SButton text="Save Layout" color="primary" onClick={saveLayout} />
        </div>
      </div>

      {/* Side Panel Toggle */}
      <SIcon
        name={isPanelExpanded ? 'chevron-right' : 'chevron-left'}
        size={20}
        className="template-builder-panel-toggle"
        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
        title={isPanelExpanded ? 'Collapse panel' : 'Expand panel'}
        aria-label={isPanelExpanded ? 'Collapse panel' : 'Expand panel'}
      />

      {/* Side Panel (Container Config or Fields Toolbox) */}
      {isPanelExpanded && (
        <div className="template-builder-sidebar">
          {selectedCol ? (
            <>
              <div className="template-builder-sidebar-header">
                <div>
                  <h3>Container Configuration</h3>
                  <p>Configure column width</p>
                </div>
              </div>
              <div className="template-builder-sidebar-content">
                <SDropdown
                  label="Container Width"
                  value={tempWidth}
                  options={WIDTH_OPTIONS}
                  onChange={(val) => setTempWidth(parseInt(val, 10))}
                />
                <p className="template-builder-helper-text">
                  Change the width of this column. A full row is 12 columns wide.
                </p>
                <div className="template-builder-sidebar-actions">
                  <SButton
                    text="Cancel"
                    color="secondary"
                    size="small"
                    onClick={cancelContainerConfig}
                  />
                  <SButton
                    text="Save"
                    color="primary"
                    size="small"
                    onClick={saveContainerConfig}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="template-builder-sidebar-header">
                <div>
                  <h3>Available Fields</h3>
                  <p>Drag fields to layout</p>
                </div>
              </div>
              <div className="template-builder-sidebar-content">
                {availableFields.length === 0 ? (
                  <p className="template-builder-empty-text">All fields placed</p>
                ) : (
                  availableFields.map((field) => (
                    <div
                      key={field.uuid}
                      className="template-builder-field-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, field.uuid)}
                    >
                      <span className="template-builder-field-icon">⠿</span>
                      <span>{field.label || field.fieldName}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TemplateBuilder;
