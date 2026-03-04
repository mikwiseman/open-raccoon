"use client";

export type TableBlockData = {
  type: "table";
  headers: string[];
  rows: string[][];
  caption?: string;
};

export function TableBlock({ block }: { block: TableBlockData }) {
  return (
    <div className="cb-table-block">
      {block.caption && <div className="cb-table-caption">{block.caption}</div>}
      <div className="cb-table-scroll">
        <table className="cb-table">
          <thead>
            <tr>
              {block.headers.map((header, i) => (
                <th key={i} className="cb-table-th">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="cb-table-td">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
