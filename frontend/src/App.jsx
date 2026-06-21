import { useState, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { ChatWindow } from './components/ChatWindow';
import { sendMessage } from './services/api';
import axios from 'axios';

import { 
  IoCloudUpload, 
  IoMoon, 
  IoSunny, 
  IoSend, 
  IoStop, 
  IoMenu, 
  IoClose, 
  IoTrash, 
  IoDownload, 
  IoDocumentText 
} from "react-icons/io5";

const App = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeFilePath, setActiveFilePath] = useState(null);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState(() => localStorage.getItem("aegis-mode") || "csv");
  const [theme, setTheme] = useState(() => localStorage.getItem("aegis-theme") || "light");
  
  // Mobile drawer states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Local file schema metadata
  const [fileSchemas, setFileSchemas] = useState({});

  // Stop button animation & network abort refs
  const abortControllerRef = useRef(null);
  const summaryIntervalRef = useRef(null);
  const codeIntervalRef = useRef(null);
  const isStoppedRef = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("aegis-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("aegis-mode", mode);
  }, [mode]);

  // Client-side quick CSV column extraction
  const extractCsvSchema = async (path, rawFile) => {
    if (!rawFile) return;
    if (!rawFile.name.toLowerCase().endsWith(".csv")) {
      setFileSchemas(prev => ({
        ...prev,
        [path]: { name: rawFile.name, type: "excel", columns: [] }
      }));
      return;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          if (!text) return resolve();

          const firstLine = text.split("\n")[0];
          if (!firstLine) return resolve();

          const delimiter = firstLine.includes(";") ? ";" : ",";
          const columns = firstLine
            .split(delimiter)
            .map(c => c.trim().replace(/^["']|["']$/g, ""))
            .filter(c => c.length > 0);

          setFileSchemas(prev => ({
            ...prev,
            [path]: { name: rawFile.name, type: "csv", columns }
          }));
        } catch (err) {
          console.error("Failed to parse CSV client-side", err);
        }
        resolve();
      };
      // Read first 8KB of file (extremely fast, doesn't lock thread)
      reader.readAsText(rawFile.slice(0, 8192));
    });
  };

  const handleStop = () => {
    // 1. Abort axios network query if loading
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 2. Set stopped flag to break active interval loops
    isStoppedRef.current = true;

    // 3. Clear typing intervals
    if (summaryIntervalRef.current) {
      clearInterval(summaryIntervalRef.current);
      summaryIntervalRef.current = null;
    }
    if (codeIntervalRef.current) {
      clearInterval(codeIntervalRef.current);
      codeIntervalRef.current = null;
    }

    setIsLoading(false);
    setIsTyping(false);
  };

  const handleSend = async (customQuery, customMode) => {
    const userQuery = typeof customQuery === "string" ? customQuery : input;
    if (!userQuery.trim()) return;

    // Cancel any current generation before starting new one
    handleStop();

    // Reset stopped state flag
    isStoppedRef.current = false;

    setMessages(prev => [
      ...prev,
      {
        role: "user",
        content: userQuery,
      },
    ]);

    setInput("");
    setIsLoading(true);

    // Setup network AbortController
    abortControllerRef.current = new AbortController();

    const activeMode = customMode || mode;

    try {
      const data = await sendMessage(
        userQuery,
        activeFilePath,
        activeMode,
        abortControllerRef.current.signal
      );

      // Reset loading once data arrives
      setIsLoading(false);
      setIsTyping(true);

      const fullText = data.summary || "";
      const fullCode = data.code || "";

      // Add empty assistant response bubble
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "",
          code: "",
          chartSpec: null,
          result: "",
        },
      ]);

      const updateLastMessage = (changes) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            ...changes,
          };
          return updated;
        });
      };

      // ===== TYPE SUMMARY =====
      const typeSummary = () =>
        new Promise(resolve => {
          if (!fullText) return resolve();
          let i = 0;
          summaryIntervalRef.current = setInterval(() => {
            if (isStoppedRef.current) {
              clearInterval(summaryIntervalRef.current);
              summaryIntervalRef.current = null;
              resolve();
              return;
            }

            i++;
            updateLastMessage({
              content: fullText.slice(0, i),
            });

            if (i >= fullText.length) {
              clearInterval(summaryIntervalRef.current);
              summaryIntervalRef.current = null;
              resolve();
            }
          }, 10);
        });

      // ===== TYPE CODE =====
      const typeCode = () =>
        new Promise(resolve => {
          if (!fullCode) return resolve();
          const lines = fullCode.split("\n");
          let currentLine = 0;
          codeIntervalRef.current = setInterval(() => {
            if (isStoppedRef.current) {
              clearInterval(codeIntervalRef.current);
              codeIntervalRef.current = null;
              resolve();
              return;
            }

            currentLine++;
            updateLastMessage({
              code: lines.slice(0, currentLine).join("\n"),
            });

            if (currentLine >= lines.length) {
              clearInterval(codeIntervalRef.current);
              codeIntervalRef.current = null;
              resolve();
            }
          }, 60);
        });

      await typeSummary();
      await typeCode();

      // Show charts & execution output only if we didn't stop
      if (!isStoppedRef.current) {
        updateLastMessage({
          chartSpec: data.chart_spec,
          result: data.result,
        });
      }

    } catch (error) {
      if (axios.isCancel(error)) {
        console.log("Request stopped by user abort");
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: "*[Session query stopped]*"
          }
        ]);
      } else {
        console.error(error);
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: "Error: Failed to get response from server.",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this conversation?")) {
      setMessages([]);
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    let md = "# AegisData AI - Analytical Chat Session\n\n";
    messages.forEach(m => {
      md += `### ${m.role === 'user' ? '👤 User' : '🤖 AegisData AI'}\n\n`;
      if (m.content) {
        md += `${m.content}\n\n`;
      }
      if (m.code) {
        md += `**Generated Python Code:**\n\`\`\`python\n${m.code}\n\`\`\`\n\n`;
      }
      if (m.result) {
        md += `**Execution Result:**\n\`\`\`json\n${JSON.stringify(m.result, null, 2)}\n\`\`\`\n\n`;
      }
      md += "---\n\n";
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegisdata_chat_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      {/* Dynamic Background Glow Elements */}
      <div className="app-bg-glow" />

      {/* Mobile Drawer Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />

      {/* Left panel / Sidebar */}
      <div className={`left-panel ${isSidebarOpen ? 'open' : ''}`}>
        <div className="brand-header">
          <div className="brand-logo-container">
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <defs>
                <linearGradient id="shieldGradApp" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#818cf8" />
                  <stop offset="100%" stop-color="#4f46e5" />
                </linearGradient>
              </defs>
              <path 
                d="M50 15 C65 15, 78 20, 80 32 C80 58, 68 76, 50 85 C32 76, 20 58, 20 32 C22 20, 35 15, 50 15 Z" 
                fill="url(#shieldGradApp)" 
                stroke="#ffffff" 
                stroke-width="2" 
              />
              <circle cx="50" cy="48" r="8" fill="#ffffff" />
            </svg>
          </div>
          <div className="brand-title-wrap">
            <h1>AegisData AI</h1>
            <p>Smart Analyst</p>
          </div>
          
          <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>
            <IoClose size={20} />
          </button>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-controls">
          <span style={{ fontSize: "0.85rem", fontWeight: "600", flex: 1 }}>Theme Preference</span>
          <button
            className="theme-btn"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            title="Toggle theme"
          >
            {theme === "light" ? <IoMoon /> : <IoSunny />}
          </button>
        </div>

        <div className="mode-selector">
          <p className="section-title">Analysis Mode</p>
          <select
            className="mode-dropdown"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="csv">CSV Analysis</option>
            <option value="sql">SQL Query</option>
            <option value="code">Generate Code</option>
            <option value="general">General</option>
          </select>
        </div>

        <div className="uploaded-section">
          <h2 className="section-title">
            <IoDocumentText size={14} style={{ marginRight: "4px" }} />
            Uploaded Datasets
          </h2>
          <div className="datasets-scroll-container">
            {uploadedFiles.length === 0 ? (
              <p className="no-files-text">No datasets uploaded yet.</p>
            ) : (
              <div className="files-list">
                {uploadedFiles.map((path) => {
                  const name = path.split(/[/\\]/).pop();
                  const isActive = activeFilePath === path;
                  return (
                    <div
                      key={path}
                      className={`uploaded-file-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setActiveFilePath(path);
                        setIsSidebarOpen(false); // Close sidebar on mobile select
                      }}
                    >
                      <IoCloudUpload size={16} className="file-item-icon" />
                      <span className="file-item-name" title={name}>{name}</span>
                      {isActive && <span className="active-badge">Active</span>}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Display local CSV schema reference in sidebar */}
            {activeFilePath && fileSchemas[activeFilePath] && fileSchemas[activeFilePath].columns.length > 0 && (
              <div style={{ marginTop: "14px" }}>
                <p className="columns-pane-title">Columns ({fileSchemas[activeFilePath].columns.length})</p>
                <div className="columns-pane">
                  <div className="column-tags-list">
                    {fileSchemas[activeFilePath].columns.map((col, idx) => (
                      <span key={idx} className="column-badge" title={col}>
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <FileUpload
          onUploadSuccess={(newPaths, files) => {
            setUploadedFiles((prev) => {
              const updated = [...prev, ...newPaths].filter(
                (value, index, self) => self.indexOf(value) === index
              );
              return updated;
            });
            
            // Extract CSV schemas
            newPaths.forEach((path, idx) => {
              if (files && files[idx]) {
                extractCsvSchema(path, files[idx]);
              }
            });

            setActiveFilePath((prevActive) => prevActive || newPaths[0] || null);
          }}
        />
      </div>

      {/* Right panel / Chat console */}
      <div className="right-panel">
        <div className="chat-header">
          <div className="chat-header-info">
            <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(true)}>
              <IoMenu />
            </button>
            <h1 style={{ marginLeft: "8px" }}>Console</h1>
          </div>

          <div className="chat-header-actions">
            {messages.length > 0 && (
              <>
                <button className="header-action-btn" onClick={handleExportChat} title="Export chat session">
                  <IoDownload size={14} />
                  <span>Export</span>
                </button>
                <button className="header-action-btn" onClick={handleClearChat} title="Clear conversation">
                  <IoTrash size={14} />
                  <span>Clear</span>
                </button>
              </>
            )}
          </div>
        </div>

        <ChatWindow 
          messages={messages} 
          isLoading={isLoading} 
          onSelectSuggestion={(sugText, sugMode) => {
            if (sugMode) setMode(sugMode);
            handleSend(sugText, sugMode);
          }}
        />

        <div className="input-area">
          <input
            value={input}
            placeholder={
              activeFilePath 
                ? "Ask a question about the active dataset..." 
                : "Upload a CSV / Excel dataset to begin..."
            }
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isLoading || isTyping}
          />
          {isLoading || isTyping ? (
            <button onClick={handleStop} className="action-btn stop" title="Stop generating text">
              <IoStop size={18} />
            </button>
          ) : (
            <button 
              onClick={() => handleSend()} 
              className="action-btn send" 
              disabled={!input.trim()}
              title="Send query"
            >
              <IoSend size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
