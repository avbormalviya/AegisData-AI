import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { IoCopyOutline, IoCheckmarkOutline, IoCheckmarkCircle, IoTerminalOutline } from "react-icons/io5";

export const CodeRenderer = ({ code, result }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  return (
    <div className="code-renderer">
      <div className="code-renderer-container">
        <div className="code-header">
          <div className="code-lang-label">
            <IoTerminalOutline size={14} />
            <span>python</span>
          </div>
          <button 
            className={`code-copy-btn ${copied ? "copied" : ""}`} 
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <IoCheckmarkOutline size={14} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <IoCopyOutline size={14} />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
        <SyntaxHighlighter
          language="python"
          wrapLines={true}
          wrapLongLines={true}
          style={materialDark}
          customStyle={{
            fontFamily: "'JetBrains Mono', monospace",
            background: "#1e1e2e",
            padding: "16px",
            fontSize: "0.84rem",
            lineHeight: "1.5",
            margin: 0,
            borderBottomLeftRadius: "14px",
            borderBottomRightRadius: "14px",
            textShadow: "none",
          }}
          codeTagProps={{
            style: {
              color: "#f8fafc",
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {result && <ResultRenderer result={result} />}
    </div>
  );
};

// Smart Result Formatter Component
const ResultRenderer = ({ result }) => {
  if (!result) return null;

  let parsedResult = result;

  // Try to parse stringified JSON if applicable
  if (typeof result === "string") {
    const trimmed = result.trim();
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        parsedResult = JSON.parse(trimmed);
      } catch (e) {
        // Not a JSON string, fallback to default rendering
      }
    }
  }

  // Case 1: Tabular data (List of Dictionaries)
  if (
    Array.isArray(parsedResult) &&
    parsedResult.length > 0 &&
    typeof parsedResult[0] === "object" &&
    parsedResult[0] !== null
  ) {
    const keys = Object.keys(parsedResult[0]);
    const maxVisibleRows = 10;
    const visibleRows = parsedResult.slice(0, maxVisibleRows);

    return (
      <div className="result-section">
        <div className="result-section-header">
          <IoCheckmarkCircle size={16} />
          <span>Execution Result ({parsedResult.length} rows)</span>
        </div>
        <div className="result-table-wrapper">
          <table className="result-table">
            <thead>
              <tr>
                {keys.map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={index}>
                  {keys.map((key) => (
                    <td key={key}>
                      {row[key] === null || row[key] === undefined
                        ? "NaN"
                        : typeof row[key] === "object"
                        ? JSON.stringify(row[key])
                        : String(row[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsedResult.length > maxVisibleRows && (
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "6px", textAlign: "right" }}>
            Showing top {maxVisibleRows} of {parsedResult.length} rows
          </div>
        )}
      </div>
    );
  }

  // Case 2: Object / Key-Value output
  if (
    typeof parsedResult === "object" &&
    parsedResult !== null &&
    !Array.isArray(parsedResult)
  ) {
    const entries = Object.entries(parsedResult);
    if (entries.length > 0) {
      return (
        <div className="result-section">
          <div className="result-section-header">
            <IoCheckmarkCircle size={16} />
            <span>Execution Result (Attributes)</span>
          </div>
          <div className="result-table-wrapper">
            <table className="result-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([key, value]) => (
                  <tr key={key}>
                    <td style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{key}</td>
                    <td>
                      {value === null || value === undefined
                        ? "null"
                        : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
  }

  // Case 3: Text log, number, list of primitives or anything else
  return (
    <div className="result-section">
      <div className="result-section-header">
        <IoCheckmarkCircle size={16} />
        <span>Execution Output</span>
      </div>
      <div className="result-text-block">
        {typeof parsedResult === "string" ? parsedResult : JSON.stringify(parsedResult, null, 2)}
      </div>
    </div>
  );
};