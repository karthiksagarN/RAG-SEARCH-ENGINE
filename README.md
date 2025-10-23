## RAG Search Engine (Multi-Chat)

## 🔗 Quick Links
- **DEMO VIDEO FILE:** [Click Here](https://drive.google.com/file/d/1_Pqf8hIO8-o3JCM4TpzvDWDT8XyzaH46/view?usp=sharing)  
- **GITHUB CODE:** [Click Here](https://github.com/karthiksagarN/RAG-SEARCH-ENGINE)

This repository is a small Retrieval-Augmented Generation (RAG) demo that lets you create multiple chat sessions, upload documents per-chat, build persistent vector stores, and ask natural-language questions against those documents using OpenAI.

The project is split into two folders:

- `backend/` – FastAPI-based RAG API that handles chat session lifecycle, document ingestion (PDF/TXT), vector store persistence (Chroma), and querying via LangChain + OpenAI.
- `frontend/` – A small Vite + React frontend that demonstrates the client-side UI and calls the backend REST API.

## Quick summary of the flow

1. The frontend creates a chat session by POSTing to `/create_chat`.
2. The frontend (or user) uploads files (PDF/TXT) to `/upload/{chat_id}`. The backend splits documents into chunks, generates embeddings (OpenAI), and persists them to a Chroma vector store on disk scoped to that chat.
3. When a user asks a question, the frontend sends the query to `/query/{chat_id}`. The backend loads (and caches) a retrieval chain for the chat, retrieves relevant chunks, and runs an LLM to answer using the retrieved context.
4. Chats and databases can be listed (`/list_chats`) and deleted (`/delete_chat/{chat_id}`).

## Technologies used

- Backend: FastAPI, Python
- RAG / embeddings / LLM: LangChain (community helpers), LangChain OpenAI adapters
- Vector store: Chroma (persistent, file-backed)
- LLM & embeddings provider: OpenAI (models configured in backend)
- Frontend: Vite, React, TypeScript
- HTTP client: axios

## Repo layout

```
./
├─ backend/
│  ├─ main.py               # FastAPI app and RAG logic
│  ├─ uploaded_files/       # Temporary upload staging (cleaned after ingestion)
│  ├─ chroma_db/            # (example / existing DB files)
│  └─ .env                  # Put OPENAI_API_KEY here
├─ frontend/
│  ├─ src/                  # React app
│  ├─ package.json
│  └─ .env.example
├─ requirements.txt         # Python deps (backend)
└─ README.md
```

## 🏗️ System Architecture

```
                             +-------------------------+
                             |    Frontend (Vite)      |
                             |  React + TypeScript UI   |
                             +-----------+-------------+
                                         |
                                         | HTTP (REST)
                                         v
                             +-------------------------+
                             |   Backend (FastAPI)     |
                             |   `backend/main.py`     |
                             +-----------+-------------+
                                         |
         +-------------------------------+-------------------------------+
         |                                                               |
         v                                                               v
+----------------------+                                       +----------------------+
| LangChain Retrieval  |<-- uses OpenAI embeddings / LLMs -->|  OpenAI (LLM & Emb)  |
| + retrieval chains   |                                       |  (text-embedding-*)  |
+----------------------+                                       +----------------------+
         |
         v
+----------------------+    persistent per-chat DBs    +----------------------+
|   Vector Store       |<------------------------------>|   all_chat_dbs/      |
|   (Chroma)           |   (Chroma on-disk, per-chat)   |  (chat_id folders)    |
+----------------------+                               +----------------------+
         |
         v
+----------------------+
| Uploaded files stash |  (temporary uploads, cleaned)  
|  `backend/uploaded_files/` |
+----------------------+

```


## Important paths & runtime data

- Chat-specific persistent vector stores are created under `all_chat_dbs/` (created by the backend at runtime). If you run the backend from the `backend/` folder, `all_chat_dbs/` will be created there.
- Uploaded files are temporarily saved to `backend/uploaded_files/` and removed after ingestion.
- There is an example `backend/chroma_db/` directory checked-in in this project; the app uses `all_chat_dbs/` by default but you may reuse or migrate existing Chroma files if desired.

## Environment variables

- Create a `.env` file in `backend/` with:

```
OPENAI_API_KEY=sk-...your-key-here...
```

The backend code reads `OPENAI_API_KEY` from the environment and will raise errors if the key is missing or invalid.

You can also add a `.env` in `frontend/` (or edit `.env.example`) to configure the frontend dev server and backend base URL if the client code expects it. A common variable is `VITE_API_BASE` or simply editing the client code's API base to `http://localhost:8000`.

## Setup and run (recommended)

Prerequisites: Python 3.10+ (or 3.11), Node.js 18+/npm (or pnpm/yarn)

1) Install backend Python dependencies

```bash
cd backend
python -m venv .venv        # optional but recommended
source .venv/bin/activate
pip install -r ../requirements.txt
# If uvicorn isn't in requirements, install it:
pip install uvicorn
```

2) Run the backend (FastAPI)

Run from the `backend/` folder so relative paths are correct:

```bash
cd backend
# Expose the app on port 8000 (default)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The FastAPI interactive docs will be available at: http://localhost:8000/docs

3) Install and run frontend

```bash
cd frontend
npm install
npm run dev
```

Vite's dev server will usually be at http://localhost:5173 — open that in your browser to see the UI.

Run both backend and frontend concurrently during development.

## Example API usage

Create a chat session (returns a chat_id):

```bash
curl -X POST "http://localhost:8000/create_chat" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project Docs"}'
```

Upload documents to a chat (multi-part form; PDF/TXT supported):

```bash
curl -X POST "http://localhost:8000/upload/<CHAT_ID>" \
  -F "files=@/path/to/doc1.pdf" \
  -F "files=@/path/to/doc2.txt"
```

Query the chat:

```bash
curl -X POST "http://localhost:8000/query/<CHAT_ID>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the main idea of the document?"}'
```

List chats:

```bash
curl http://localhost:8000/list_chats
```

Delete a chat and its vector store:

```bash
curl -X DELETE http://localhost:8000/delete_chat/<CHAT_ID>
```

## Common issues & troubleshooting

- OpenAI API key errors: If the backend logs errors mentioning "api_key" or returns 500 errors, verify `OPENAI_API_KEY` is set and valid. Make sure you have quota and the right model access.
- Port conflicts: Ensure no other server is running on ports 8000 or 5173.
- Large PDFs: Document loaders may fail on extremely large or malformed PDFs; try splitting files or converting to plain text.
- CORS: The backend currently allows all origins via FastAPI's CORSMiddleware — this is convenient for development but consider restricting it for production.

## Notes and assumptions

- The backend expects to be run from the `backend/` folder so relative paths such as `all_chat_dbs/` and `uploaded_files/` resolve there.
- The code uses OpenAI for embeddings and responses; if you want to swap providers locally you will need to update the embedding/LLM initialization in `backend/main.py`.
- The repository includes an example Chroma DB snapshot in `backend/chroma_db/`. The app stores active chat DBs under a separate `all_chat_dbs/` folder at runtime.

## Next steps (suggested improvements)

- Add a docker-compose for easy local startup of both frontend and backend.
- Add tests for the backend endpoints (pytest) and one end-to-end test to validate the upload -> query flow.
- Add more robust metadata (timestamp, human-readable created_at) and authentication for multi-user support.

---

If you'd like, I can also:

- Add a simple `docker-compose.yml` to run both services.
- Add a tiny integration test to validate the upload + query happy path (using a small text file and a mocked OpenAI response).

If you want one of those next, tell me which and I'll implement it.

---

## 🧾 Deliverables
- ✅ **GitHub Repository** (Open access)  
- ✅ **Demo Video (Optional)**  
- ✅ **Documentation (this file)**  

---

## 🧑‍💻 Author
**N. Karthik Sagar**  
[GitHub](https://github.com/karthiksagarn) | [LinkedIn](https://linkedin.com/in/karthik-sagar-nallagula)  | [Portfolio](https://nkarthiksagar.vercel.app/)
