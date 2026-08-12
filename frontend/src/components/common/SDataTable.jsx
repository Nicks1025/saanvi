import React from 'react';

const SDataTable = ({ columns = [], data = [], pagination = {} }) => {
  const { sortColu, sortOrder, noOfPagesToDisplay } = pagination;

  return (
    <div className="s-data-table">
      <table>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => (
                <td key={colIndex}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination controls can be implemented here based on props */}
      <div className="pagination">
        <span>Pages to display: {noOfPagesToDisplay}</span>
        <span>Sorting by: {sortColu} ({sortOrder})</span>
      </div>
    </div>
  );
};

export default SDataTable;
