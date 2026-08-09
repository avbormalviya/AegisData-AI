import { useState, useEffect, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { ChatWindow } from './components/ChatWindow';
import { sendMessage } from './services/api';
import axios from 'axios';
import logo_dark from "../public/logo-dark.svg";
import logo_light from "../public/logo-light.svg"

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
  IoDocumentText,
  IoPhonePortrait,
  IoShareSocial,
  IoAddCircle
} from "react-icons/io5";

const App = () => {
  // Load persisted state from localStorage
  const [messages, setMessages] = useState(() => JSON.parse(localStorage.getItem('chatMessages') || '[]'));
  const [uploadedFiles, setUploadedFiles] = useState(() => JSON.parse(localStorage.getItem('uploadedFiles') || '[]'));
  const [activeFilePath, setActiveFilePath] = useState(() => localStorage.getItem('activeFilePath') || null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("aegis-theme") || "light");
  
  // Mobile drawer states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Local file schema metadata
  const [fileSchemas, setFileSchemas] = useState({});

  // PWA Install prompt states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);

  // Stop button animation & network abort refs
  const abortControllerRef = useRef(null);
  const summaryIntervalRef = useRef(null);
  const codeIntervalRef = useRef(null);
  const isStoppedRef = useRef(false);

  // Detect PWA mode and capture install prompt event
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    if (isIOS || !deferredPrompt) {
      setShowPwaModal(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Persist state updates
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
    localStorage.setItem('activeFilePath', activeFilePath || '');
  }, [uploadedFiles, activeFilePath]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("aegis-theme", theme);
  }, [theme]);

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

  const handleSend = async (customQuery) => {
  const userQuery = typeof customQuery === "string" ? customQuery : input;
  if (!userQuery.trim()) return;

  handleStop();
  isStoppedRef.current = false;

  setMessages(prev => [...prev, { role: "user", content: userQuery }]);
  setInput("");
  setIsLoading(true);

  abortControllerRef.current = new AbortController();

  try {
    // build history from current messages BEFORE adding the new user message
    const history = messages
    .filter(m => !m.content?.startsWith("Error:") && !m.content?.startsWith("*[Session"))
    .map(m => ({ role: m.role, content: m.content }));

    const data = await sendMessage(
      userQuery,
      activeFilePath,
      history,
      abortControllerRef.current.signal
    );

    console.log(data.messages);
    

    setIsLoading(false);
    setIsTyping(true);

    const rawMessages = data.messages || [];

    // extract the final AI text response
    let finalText = "";
    for (let i = rawMessages.length - 1; i >= 0; i--) {
      if (rawMessages[i].type === "AIMessage" && rawMessages[i].content) {
        finalText = rawMessages[i].content;
        break;
      }
    }

    // extract chart_tool result if present (search from the end to get the current turn's chart)
    let chartSpec = null;
    for (let i = rawMessages.length - 1; i >= 0; i--) {
      if (rawMessages[i].type === "ToolMessage" && rawMessages[i].name === "chart_tool") {
        chartSpec = rawMessages[i].content;
        break;
      }
    }

    // Extract all ToolMessages for the current turn (since the last HumanMessage)
    const currentTurnTools = [];
    let lastHumanIndex = -1;
    for (let i = rawMessages.length - 1; i >= 0; i--) {
      if (rawMessages[i].type === "HumanMessage") {
        lastHumanIndex = i;
        break;
      }
    }

    if (lastHumanIndex !== -1) {
      for (let i = lastHumanIndex + 1; i < rawMessages.length; i++) {
        if (rawMessages[i].type === "ToolMessage") {
          currentTurnTools.push({
            name: rawMessages[i].name,
            content: rawMessages[i].content
          });
        }
      }
    }

    if (!isStoppedRef.current) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: finalText, chartSpec, trace: currentTurnTools },
      ]);
    }

  } catch (error) {
    if (axios.isCancel(error)) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "*[Session query stopped]*" }
      ]);
    } else {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Error: Failed to get response from server." },
      ]);
    }
  } finally {
    setIsLoading(false);
    setIsTyping(false);
    abortControllerRef.current = null;
  }};

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
            <img src={theme === "light" ? logo_light : logo_dark} alt="AegisData AI" />
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

        {!isAppInstalled && (
          <button className="pwa-sidebar-btn" onClick={handleInstallPWA}>
            <IoPhonePortrait size={16} />
            <span>Install App on Mobile</span>
          </button>
        )}

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
                      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <IoCloudUpload size={16} className="file-item-icon" />
                        <span className="file-item-name" title={name}>{name}</span>
                        {isActive && (
                          <span
                            className="active-badge"
                            style={{
                              flexShrink: 0
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setUploadedFiles(prev => prev.filter(p => p !== path));
                          if (activeFilePath === path) setActiveFilePath(null);
                        }}
                        className="file-item-delete"
                        title="Remove dataset"
                      >
                        <IoTrash size={14} />
                      </button>
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
            {!isAppInstalled && (
              <button className="pwa-install-btn" onClick={handleInstallPWA} title="Install App to Home Screen">
                <IoPhonePortrait size={14} />
                <span>Install App</span>
              </button>
            )}
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
          theme={theme}
          onSelectSuggestion={(sugText) => { handleSend(sugText) }}
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

      {/* PWA Mobile Installation Guide Modal */}
      {showPwaModal && (
        <div className="pwa-modal-overlay" onClick={() => setShowPwaModal(false)}>
          <div className="pwa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <h3>
                <IoPhonePortrait style={{ color: "var(--accent)" }} />
                Install AegisData AI App
              </h3>
              <button className="pwa-modal-close" onClick={() => setShowPwaModal(false)}>
                <IoClose size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
              To install this app on your phone's home screen, follow these browser steps:
            </p>

            <div className="pwa-modal-steps">
              <div className="pwa-step-item">
                <div className="pwa-step-num">iOS</div>
                <div className="pwa-step-text">
                  <strong>iPhone / Safari:</strong> Tap the Share button (<IoShareSocial style={{ verticalAlign: "middle" }} />), scroll down and select <strong>"Add to Home Screen"</strong> (<IoAddCircle style={{ verticalAlign: "middle" }} />).
                </div>
              </div>

              <div className="pwa-step-item">
                <div className="pwa-step-num">AND</div>
                <div className="pwa-step-text">
                  <strong>Android / Chrome:</strong> Tap the browser menu (⋮) at top right, and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                </div>
              </div>

              <div className="pwa-step-item">
                <div className="pwa-step-num">SSL</div>
                <div className="pwa-step-text">
                  <strong>HTTPS Requirement:</strong> Mobile PWA installation requires your site to be served over <strong>HTTPS</strong> (or deployed on Vercel/Netlify). Local HTTP IP addresses (e.g. http://192.168.x.x) are blocked by mobile security.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
