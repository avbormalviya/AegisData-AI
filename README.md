# Data Analyst Agent

A full-stack AI agent that lets you query SQL databases and CSV/Excel files using natural language. Built with LangGraph for orchestration, FastAPI backend, and a React frontend.

## Features

- **Natural language to SQL** — ask questions about your database in plain English
- **CSV/Excel analysis** — upload a file and ask questions about it
- **Automatic chart generation** — get bar/line charts rendered from your data
- **Code generation mode** — generate and execute Python code for data analysis
- **General conversation mode** — chat naturally when you don't need data analysis
- **Manual mode selection** — choose between SQL, CSV, Code, or General to avoid misclassification
- **Dark/light theme**
- **Markdown rendering** with syntax-highlighted code blocks
- **Typing animation** for responses

## Tech Stack

**Backend**
- FastAPI
- LangGraph (agent orchestration)
- LangChain + Groq (Llama 3.3 70B)
- SQLAlchemy (SQL connectivity)
- Pandas (CSV/Excel processing)

**Frontend**
- React (Vite)
- Recharts (chart rendering)
- React Markdown + remark-gfm
- React Icons

## How it works

1. User selects a mode (SQL, CSV, Code, General) and optionally uploads a CSV/Excel file
2. Backend routes the query through a LangGraph state machine
3. Depending on mode:
   - **SQL** — LLM generates SQL from the schema, executes against the database
   - **CSV** — LLM generates Pandas code from the dataframe schema, executes it
   - **Code** — LLM generates and runs Python code, returns both code and result
   - **General** — LLM responds conversationally, no data access
4. For SQL/CSV modes, results are automatically passed to chart and summary tools
5. Response streams back with summary text, chart spec, and/or generated code

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
# create .env with GROQ_API_KEY, DATABASE_URL, etc.
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Why manual routing instead of LLM tool binding

Free-tier LLMs (Llama 3.3 70B via Groq) are unreliable at native tool calling — they often skip tools or return malformed calls. This project uses explicit mode selection and manual LangGraph routing instead of `bind_tools()`, trading some "agentic autonomy" for reliability. This is documented as a deliberate architectural decision, not a limitation we were unaware of.

## Known limitations

- Single hardcoded database connection (no multi-tenant DB support)
- `exec()`/`eval()` used for dynamic code execution — sandboxing not yet implemented
- No authentication/session management

## License

MIT
