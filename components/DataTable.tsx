"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface DataTableProps {
  children: React.ReactNode;
  defaultPageSize?: number;
}

interface ElementWithProps {
  children?: React.ReactNode;
  node?: { tagName?: string };
  [key: string]: unknown;
}

/**
 * Recursively extracts plain text from any ReactNode (including nested links, spans, badges)
 */
function getNodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getNodeText).join(" ");
  if (React.isValidElement(node) && node.props) {
    const props = node.props as ElementWithProps;
    return getNodeText(props.children);
  }
  return "";
}

export const DataTable: React.FC<DataTableProps> = ({
  children,
  defaultPageSize = 20,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [copied, setCopied] = useState(false);

  // Extract thead and tbody from table children
  const { thead, rows } = useMemo(() => {
    const childrenArray = React.Children.toArray(children);
    let foundThead: React.ReactNode = null;
    let foundRows: React.ReactElement[] = [];

    for (const child of childrenArray) {
      if (!React.isValidElement(child)) continue;

      const props = child.props as ElementWithProps;
      const typeName =
        typeof child.type === "string"
          ? child.type
          : props?.node?.tagName || "";

      if (typeName === "thead") {
        foundThead = child;
      } else if (typeName === "tbody") {
        const bodyChildren = props?.children;
        if (bodyChildren) {
          foundRows = React.Children.toArray(bodyChildren).filter(
            React.isValidElement
          );
        }
      }
    }

    // Fallback if structure is flat
    if (!foundThead && childrenArray.length > 0) {
      foundThead = childrenArray[0];
    }
    if (foundRows.length === 0 && childrenArray.length > 1) {
      const second = childrenArray[1];
      if (React.isValidElement(second) && second.props) {
        const props = second.props as ElementWithProps;
        if (props.children) {
          foundRows = React.Children.toArray(props.children).filter(React.isValidElement);
        }
      }
    }

    return { thead: foundThead, rows: foundRows };
  }, [children]);

  // Pre-calculate search index for each row to keep search instant
  const indexedRows = useMemo(() => {
    return rows.map((row) => ({
      element: row,
      text: getNodeText(row).toLowerCase(),
    }));
  }, [rows]);

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return indexedRows;
    return indexedRows.filter((item) => item.text.includes(query));
  }, [indexedRows, searchTerm]);

  // Pagination calculations
  const totalRows = filteredRows.length;
  const effectivePageSize = pageSize === 0 ? totalRows : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalRows / (effectivePageSize || 1)));

  // Adjust current page if search reduces row count
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * effectivePageSize;
  const displayedRows =
    pageSize === 0
      ? filteredRows
      : filteredRows.slice(startIndex, startIndex + effectivePageSize);

  const startRecordNum = totalRows === 0 ? 0 : startIndex + 1;
  const endRecordNum =
    pageSize === 0
      ? totalRows
      : Math.min(startIndex + effectivePageSize, totalRows);

  // If table is compact (8 rows or fewer) and no search active, render simple table
  if (rows.length <= 8 && !searchTerm) {
    return (
      <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
          {children}
        </table>
      </div>
    );
  }

  // Copy table content as TSV
  const handleCopyTable = async () => {
    try {
      const theadText = getNodeText(thead)
        .replace(/\n+/g, "\t")
        .trim();
      const rowsText = filteredRows
        .map((r) => {
          const props = r.element.props as ElementWithProps;
          const cells = React.Children.toArray(props?.children);
          return cells.map(getNodeText).join("\t");
        })
        .join("\n");

      const fullTsv = `${theadText}\n${rowsText}`;
      await navigator.clipboard.writeText(fullTsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden text-xs sm:text-sm transition-all">
      {/* Interactive Control Header */}
      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Record summary badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-200 dark:border-blue-900/60">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>
              {totalRows === rows.length
                ? `${rows.length} records`
                : `${totalRows} of ${rows.length} matches`}
            </span>
          </span>

          <span className="text-slate-500 dark:text-slate-400 text-xs hidden sm:inline">
            Showing {startRecordNum}–{endRecordNum} of {totalRows}
          </span>
        </div>

        {/* Right: Search Filter & Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Quick Search Box */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search records..."
              className="pl-8 pr-7 py-1 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-48 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="py-1 px-2 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 focus:outline-none"
            title="Rows per page"
          >
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={0}>Show all</option>
          </select>

          {/* Copy Table Button */}
          <button
            type="button"
            onClick={handleCopyTable}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/70 transition-colors"
            title="Copy table data"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left">
          {thead}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
            {displayedRows.length > 0 ? (
              displayedRows.map((item, idx) => (
                <React.Fragment key={idx}>{item.element}</React.Fragment>
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs italic"
                >
                  No matching records found for &ldquo;{searchTerm}&rdquo;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (shown when rows exceed page size or multiple pages exist) */}
      {totalPages > 1 && (
        <div className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Page <span className="font-semibold text-slate-700 dark:text-slate-200">{validCurrentPage}</span> of{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPages}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage <= 1}
              className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {/* Quick Page Jump Buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Calculate page numbers around current page
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (validCurrentPage <= 3) {
                pageNum = i + 1;
              } else if (validCurrentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = validCurrentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                    validCurrentPage === pageNum
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 font-medium"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage >= totalPages}
              className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
