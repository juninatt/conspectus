import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'

import type { Column, ColumnType, Row, Value } from '../api/client'
import styles from './DataTable.module.css'

// Sorting and paging happen in the browser on the full dataset. When the API
// gains server-side sorting, switch to manualSorting/manualPagination here.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic, alphanumeric: sortFn_alphanumeric },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})
const helper = createColumnHelper<typeof features, Row>()

const PAGE_SIZES = [25, 50, 100]
const DEFAULT_PAGE_SIZE = 25
const NUMERIC_TYPES: ColumnType[] = ['integer', 'number']

type Props = {
  columns: Column[]
  rows: Row[]
}

export function DataTable({ columns, rows }: Props) {
  const tableColumns = useMemo(
    () =>
      helper.columns(
        columns.map((column) =>
          // Missing values become undefined so they always sort last.
          helper.accessor((row) => row[column.name] ?? undefined, {
            id: column.name,
            header: column.name,
            sortFn: column.type === 'string' ? 'alphanumeric' : 'basic',
            sortUndefined: 'last',
          }),
        ),
      ),
    [columns],
  )
  const typesByName = useMemo(
    () => new Map(columns.map((column) => [column.name, column.type])),
    [columns],
  )

  const table = useTable({
    features,
    columns: tableColumns,
    data: rows,
    // Every column starts ascending on first click, numbers included.
    sortDescFirst: false,
    initialState: { pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE } },
  })

  const { pageIndex, pageSize } = table.atoms.pagination.get()
  const firstRow = rows.length === 0 ? 0 : pageIndex * pageSize + 1
  const lastRow = Math.min((pageIndex + 1) * pageSize, rows.length)

  return (
    <div className={styles.container}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const type = typesByName.get(header.column.id)
                  return (
                    <th
                      key={header.id}
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : 'none'
                      }
                      className={isNumeric(type) ? styles.numeric : undefined}
                    >
                      <button
                        type="button"
                        className={styles.sortButton}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className={styles.columnName}>
                          {header.column.id}
                          <span className={styles.sortIndicator} aria-hidden>
                            {sorted === 'asc'
                              ? ' ▲'
                              : sorted === 'desc'
                                ? ' ▼'
                                : ''}
                          </span>
                        </span>
                        <span className={styles.columnType}>{type}</span>
                      </button>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => {
                  const type = typesByName.get(cell.column.id)
                  const value = cell.getValue() as Value | undefined
                  return (
                    <td
                      key={cell.id}
                      className={isNumeric(type) ? styles.numeric : undefined}
                    >
                      {value === null || value === undefined ? (
                        <span className={styles.missing} title="No value">
                          —
                        </span>
                      ) : (
                        formatValue(value, type)
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.empty}>No rows.</p>}
      </div>

      <div className={styles.footer}>
        <span>
          Rows {firstRow}–{lastRow} of {rows.length}
        </span>
        <div className={styles.paging}>
          <label className={styles.pageSize}>
            Rows per page
            <select
              value={pageSize}
              onChange={(event) =>
                table.setPageSize(Number(event.target.value))
              }
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <span>
            Page {pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
          </span>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function isNumeric(type: ColumnType | undefined): boolean {
  return type !== undefined && NUMERIC_TYPES.includes(type)
}

function formatValue(value: string | number | boolean, type?: ColumnType) {
  if (type === 'datetime' && typeof value === 'string') {
    return value.replace('T', ' ')
  }
  return String(value)
}
