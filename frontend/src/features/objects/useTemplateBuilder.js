import { useState, useEffect, useCallback } from 'react';

/**
 * Generates a unique placement UUID for each layout field card.
 */
export const generatePlacementUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Normalizes a field placement item into { placementUuid, fieldUuid }.
 */
export const createPlacement = (fieldUuid, placementUuid = null) => ({
  placementUuid: placementUuid || generatePlacementUuid(),
  fieldUuid
});

/**
 * Custom hook for Template Builder state management, layout operations,
 * and drag-and-drop orchestration with full support for repeated field placements.
 */
export const useTemplateBuilder = (template, formFields, onSave) => {
  const [rows, setRows] = useState([]);
  const [selectedCol, setSelectedCol] = useState(null); // { rowIndex, colIndex }
  const [tempWidth, setTempWidth] = useState(12);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  // Initialize or re-sync layout from template
  useEffect(() => {
    if (template && template.fields && template.fields.length > 0) {
      const maxRow = Math.max(...template.fields.map((f) => f.row_number ?? f.rowNumber ?? 0), 0);
      const initialRows = [];

      for (let r = 0; r <= maxRow; r++) {
        const fieldsInRow = template.fields.filter((f) => (f.row_number ?? f.rowNumber ?? 0) === r);
        if (fieldsInRow.length > 0) {
          const maxCol = Math.max(...fieldsInRow.map((f) => f.column_number ?? f.columnNumber ?? 0), 0);
          const columns = [];
          for (let c = 0; c <= maxCol; c++) {
            const fieldsInCol = fieldsInRow
              .filter((f) => (f.column_number ?? f.columnNumber ?? 0) === c)
              .sort((a, b) => (a.display_order ?? a.displayOrder ?? 0) - (b.display_order ?? b.displayOrder ?? 0));

            if (fieldsInCol.length > 0) {
              columns.push({
                id: `col-${r}-${c}-${Date.now()}`,
                fields: fieldsInCol.map((f) =>
                  createPlacement(
                    f.field_uuid || f.fieldUuid,
                    f.placement_uuid || f.placementUuid
                  )
                ),
                width: fieldsInCol[0].width || 12,
              });
            }
          }
          if (columns.length > 0) {
            initialRows.push({
              id: `row-${r}-${Date.now()}`,
              columns,
            });
          }
        }
      }
      setRows(initialRows);
    } else {
      setRows([{ id: `row-${Date.now()}`, columns: [] }]);
    }
  }, [template]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { id: `row-${Date.now()}`, columns: [] }]);
  }, []);

  const removeRow = useCallback((rowIndex) => {
    setRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
    setSelectedCol((current) => (current && current.rowIndex === rowIndex ? null : current));
  }, []);

  const addColumn = useCallback((rowIndex) => {
    setRows((prev) => {
      const newRows = [...prev];
      const targetRow = newRows[rowIndex];
      if (!targetRow) return prev;
      const totalWidth = targetRow.columns.reduce((sum, col) => sum + parseInt(col.width || 0, 10), 0);
      let defaultWidth = 6;
      if (totalWidth + defaultWidth > 12) defaultWidth = 12 - totalWidth;
      if (defaultWidth <= 0) defaultWidth = 6;

      targetRow.columns.push({
        id: `col-${Date.now()}`,
        fields: [],
        width: defaultWidth,
      });
      return newRows;
    });
  }, []);

  const removeColumn = useCallback((rowIndex, colIndex) => {
    setRows((prev) => {
      const newRows = [...prev];
      if (newRows[rowIndex]) {
        newRows[rowIndex].columns.splice(colIndex, 1);
      }
      return newRows;
    });
    setSelectedCol((current) =>
      current && current.rowIndex === rowIndex && current.colIndex === colIndex ? null : current
    );
  }, []);

  const removeField = useCallback((rowIndex, colIndex, fieldIndex) => {
    setRows((prev) => {
      const newRows = [...prev];
      if (newRows[rowIndex]?.columns[colIndex]?.fields) {
        newRows[rowIndex].columns[colIndex].fields.splice(fieldIndex, 1);
      }
      return newRows;
    });
  }, []);

  const handleDragStart = useCallback((e, fieldUuid, sourceRowIndex = null, sourceColIndex = null, placementUuid = null) => {
    e.dataTransfer.setData('fieldUuid', fieldUuid);
    e.dataTransfer.setData('sourceRow', sourceRowIndex !== null ? sourceRowIndex.toString() : '');
    e.dataTransfer.setData('sourceCol', sourceColIndex !== null ? sourceColIndex.toString() : '');
    if (placementUuid) {
      e.dataTransfer.setData('placementUuid', placementUuid);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDropToRow = useCallback((e, targetRowIndex) => {
    e.preventDefault();
    const fieldUuid = e.dataTransfer.getData('fieldUuid');
    const sourceRow = e.dataTransfer.getData('sourceRow');
    const sourceCol = e.dataTransfer.getData('sourceCol');
    const sourceFieldIdx = e.dataTransfer.getData('sourceFieldIndex');
    const existingPlacementUuid = e.dataTransfer.getData('placementUuid');

    if (!fieldUuid) return;

    setRows((prev) => {
      const newRows = prev.map((r) => ({
        ...r,
        columns: r.columns.map((c) => ({
          ...c,
          fields: [...(c.fields || [])],
        })),
      }));

      let movedItem = null;
      if (sourceRow !== '' && sourceCol !== '' && sourceFieldIdx !== '') {
        const sR = parseInt(sourceRow, 10);
        const sC = parseInt(sourceCol, 10);
        const sF = parseInt(sourceFieldIdx, 10);
        if (newRows[sR]?.columns[sC]?.fields) {
          const [removed] = newRows[sR].columns[sC].fields.splice(sF, 1);
          movedItem = removed;
        }
      }

      const placement = movedItem || createPlacement(fieldUuid, existingPlacementUuid);
      const targetRow = newRows[targetRowIndex];
      if (targetRow) {
        targetRow.columns.push({
          id: `col-${Date.now()}`,
          fields: [placement],
          width: 12,
        });
      }

      return newRows;
    });
  }, []);

  const handleDropToColumn = useCallback((e, targetRowIndex, targetColIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const fieldUuid = e.dataTransfer.getData('fieldUuid');
    if (!fieldUuid) return;

    const sourceRow = e.dataTransfer.getData('sourceRow');
    const sourceCol = e.dataTransfer.getData('sourceCol');
    const sourceFieldIdx = e.dataTransfer.getData('sourceFieldIndex');
    const existingPlacementUuid = e.dataTransfer.getData('placementUuid');

    setRows((prev) => {
      const newRows = prev.map((r) => ({
        ...r,
        columns: r.columns.map((c) => ({
          ...c,
          fields: [...(c.fields || [])],
        })),
      }));

      let movedItem = null;
      if (sourceRow !== '' && sourceCol !== '' && sourceFieldIdx !== '') {
        const sR = parseInt(sourceRow, 10);
        const sC = parseInt(sourceCol, 10);
        const sF = parseInt(sourceFieldIdx, 10);

        if (sR === targetRowIndex && sC === targetColIndex) {
          const [moved] = newRows[sR].columns[sC].fields.splice(sF, 1);
          newRows[targetRowIndex].columns[targetColIndex].fields.push(moved);
          return newRows;
        }
        const [removed] = newRows[sR]?.columns[sC]?.fields?.splice(sF, 1) || [];
        movedItem = removed;
      }

      if (!newRows[targetRowIndex].columns[targetColIndex].fields) {
        newRows[targetRowIndex].columns[targetColIndex].fields = [];
      }
      const targetFields = newRows[targetRowIndex].columns[targetColIndex].fields;

      // Requirement 5: Support repeated field placements in the same column!
      // Each placement receives its own unique placementUuid identity.
      const placement = movedItem || createPlacement(fieldUuid, existingPlacementUuid);
      targetFields.push(placement);

      return newRows;
    });
  }, []);

  const handleDropOnField = useCallback((e, targetRowIndex, targetColIndex, targetFieldIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const fieldUuid = e.dataTransfer.getData('fieldUuid');
    if (!fieldUuid) return;

    const sourceRow = e.dataTransfer.getData('sourceRow');
    const sourceCol = e.dataTransfer.getData('sourceCol');
    const sourceFieldIdx = e.dataTransfer.getData('sourceFieldIndex');
    const existingPlacementUuid = e.dataTransfer.getData('placementUuid');

    setRows((prev) => {
      const newRows = prev.map((r) => ({
        ...r,
        columns: r.columns.map((c) => ({
          ...c,
          fields: [...(c.fields || [])],
        })),
      }));

      let movedItem = null;
      if (sourceRow !== '' && sourceCol !== '' && sourceFieldIdx !== '') {
        const sR = parseInt(sourceRow, 10);
        const sC = parseInt(sourceCol, 10);
        const sF = parseInt(sourceFieldIdx, 10);

        if (sR === targetRowIndex && sC === targetColIndex) {
          const colFields = newRows[sR].columns[sC].fields;
          const [moved] = colFields.splice(sF, 1);
          colFields.splice(targetFieldIndex, 0, moved);
          return newRows;
        }
        const [removed] = newRows[sR]?.columns[sC]?.fields?.splice(sF, 1) || [];
        movedItem = removed;
      }

      const targetCol = newRows[targetRowIndex]?.columns[targetColIndex];
      if (targetCol) {
        if (!targetCol.fields) targetCol.fields = [];
        // Requirement 5: Allow repeated placement at specified index
        const placement = movedItem || createPlacement(fieldUuid, existingPlacementUuid);
        targetCol.fields.splice(targetFieldIndex, 0, placement);
      }
      return newRows;
    });
  }, []);

  const openContainerConfig = useCallback((rowIndex, colIndex, currentWidth) => {
    setSelectedCol({ rowIndex, colIndex });
    setTempWidth(parseInt(currentWidth, 10) || 12);
    setIsPanelExpanded(true);
  }, []);

  const saveContainerConfig = useCallback(() => {
    if (!selectedCol) return;
    setRows((prev) => {
      const newRows = [...prev];
      if (newRows[selectedCol.rowIndex]?.columns[selectedCol.colIndex]) {
        newRows[selectedCol.rowIndex].columns[selectedCol.colIndex].width = tempWidth;
      }
      return newRows;
    });
    setSelectedCol(null);
  }, [selectedCol, tempWidth]);

  const cancelContainerConfig = useCallback(() => {
    setSelectedCol(null);
  }, []);

  const saveLayout = useCallback(() => {
    const flatFields = [];

    rows.forEach((row, rIdx) => {
      row.columns.forEach((col, cIdx) => {
        if (col.fields && col.fields.length > 0) {
          col.fields.forEach((placement, fIdx) => {
            const fUuid = typeof placement === 'object' ? placement.fieldUuid : placement;
            const pUuid = typeof placement === 'object' ? placement.placementUuid : generatePlacementUuid();
            flatFields.push({
              placement_uuid: pUuid,
              placementUuid: pUuid,
              field_uuid: fUuid,
              fieldUuid: fUuid,
              row_number: rIdx,
              rowNumber: rIdx,
              column_number: cIdx,
              columnNumber: cIdx,
              width: parseInt(col.width || 12, 10),
              display_order: fIdx,
              displayOrder: fIdx,
            });
          });
        }
      });
    });

    if (onSave) {
      onSave(flatFields);
    }
  }, [rows, onSave]);

  // All form fields remain available in the sidebar so they can be placed multiple times
  const availableFields = formFields || [];

  return {
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
  };
};
