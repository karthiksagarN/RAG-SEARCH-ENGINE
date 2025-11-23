# RAG Search Engine - Multi-Chat Knowledge Base

## 🔗 Quick Links
- **DEMO VIDEO:** [Click Here](https://drive.google.com/file/d/1JDmQmco6dtVL7jBIPAuPlhy4vHDFjbli/view?usp=sharing)  
- **GITHUB:** [Click Here](https://github.com/karthiksagarN/RAG-SEARCH-ENGINE)

A production-ready Retrieval-Augmented Generation (RAG) application that enables users to create multiple chat sessions, upload documents, and query them using natural language powered by OpenAI. Built with modern cloud-native architecture using MongoDB and Pinecone for scalable deployment.

## ✨ Features

- 🔐 **User Authentication** - Secure JWT-based authentication system
- 💬 **Multi-Chat Sessions** - Create and manage multiple isolated chat contexts
- 📄 **Document Upload** - Support for PDF and TXT files
- 🔍 **Intelligent Search** - RAG-powered question answering using OpenAI
- ☁️ **Cloud-Native** - MongoDB for data persistence, Pinecone for vector storage
- 🎨 **Modern UI** - Beautiful React frontend with responsive design
- 🚀 **Production Ready** - Deployable on Render (backend) and Vercel (frontend)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                      │
│                  Deployed on Vercel                              │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (HTTPS)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI + Python)                     │
│                    Deployed on Render                            │
└─────┬──────────────────────┬──────────────────────┬─────────────┘
      │                      │                      │
      ▼                      ▼                      ▼
┌──────────┐         ┌──────────────┐      ┌─────────────┐
│ MongoDB  │         │   Pinecone   │      │   OpenAI    │
│ (Atlas)  │         │ Vector Store │      │  LLM + Emb  │
│  Users   │         │  Embeddings  │      │  gpt-4o-mini│
│  Chats   │         │  Per-Chat NS │      │ text-emb-3  │
└──────────┘         └──────────────┘      └─────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** MongoDB Atlas (user data, chat metadata)
- **Vector Store:** Pinecone (document embeddings)
- **LLM Provider:** OpenAI (GPT-4o-mini, text-embedding-3-small)
- **Auth:** JWT with python-jose
- **RAG Framework:** LangChain

### Frontend
- **Framework:** React 18 + Vite
- **Language:** TypeScript
- **Styling:** Custom CSS with modern design
- **HTTP Client:** Axios
- **Routing:** React Router DOM

## 📁 Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app & RAG logic
│   ├── auth.py              # JWT authentication
│   ├── database.py          # MongoDB connection
│   ├── models.py            # Pydantic models
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variables template
│   └── uploaded_files/      # Temporary file storage
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── api.ts          # API client
│   │   ├── App.tsx         # Main app component
│   │   └── index.css       # Global styles
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB Atlas account
- Pinecone account
- OpenAI API key

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/karthiksagarN/RAG-SEARCH-ENGINE.git
cd RAG-SEARCH-ENGINE/backend
```

2. **Create virtual environment**
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**

Create a `.env` file in the `backend/` directory:

```env
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=your-index-name

# JWT
SECRET_KEY=your-secret-key-for-jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

5. **Run the backend**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000  
API docs: http://localhost:8000/docs

### Frontend Setup

1. **Navigate to frontend**
```bash
cd ../frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
```

4. **Run the frontend**
```bash
npm run dev
```

Frontend will be available at: http://localhost:5173

## 🌐 Deployment

### Backend (Render)

1. **Create a new Web Service** on Render
2. **Connect your GitHub repository**
3. **Configure the service:**
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory:** `backend`

4. **Add environment variables:**
   - `OPENAI_API_KEY`
   - `MONGO_URI`
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX_NAME`
   - `SECRET_KEY`
   - `ALGORITHM`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`

### Frontend (Vercel)

1. **Import your repository** on Vercel
2. **Configure the project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

3. **Add environment variable:**
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://your-app.onrender.com`)

4. **Update frontend API configuration:**

Edit `frontend/src/api.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

## 📚 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info

### Chat Management
- `POST /create_chat` - Create new chat session
- `GET /list_chats` - List all user's chats
- `DELETE /delete_chat/{chat_id}` - Delete a chat

### Document Operations
- `POST /upload/{chat_id}` - Upload documents to chat
- `POST /query/{chat_id}` - Query documents in chat

## 🔧 Configuration

### Pinecone Setup
1. Create a Pinecone account at https://www.pinecone.io/
2. Create a new index with:
   - **Dimensions:** 1536 (for text-embedding-3-small)
   - **Metric:** Cosine
   - **Cloud:** AWS (or your preference)

### MongoDB Setup
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Add your IP to the whitelist (or allow all for development)
4. Create a database user
5. Get your connection string

## 🎯 Usage Flow

1. **Register/Login** - Create an account or login
2. **Create Chat** - Start a new chat session
3. **Upload Documents** - Upload PDF or TXT files to the chat
4. **Ask Questions** - Query your documents using natural language
5. **Get Answers** - Receive AI-generated responses with source citations

## 🐛 Troubleshooting

### Backend Issues
- **MongoDB Connection Error:** Verify `MONGO_URI` is correct and IP is whitelisted
- **Pinecone Error:** Ensure index exists and API key is valid
- **OpenAI Error:** Check API key and account quota

### Frontend Issues
- **CORS Error:** Ensure backend CORS is configured for your frontend URL
- **API Connection Failed:** Verify `VITE_API_URL` points to correct backend

### Deployment Issues
- **Render Port Error:** Ensure start command uses `--host 0.0.0.0 --port $PORT`
- **Build Failed:** Check Python version (3.11+) and requirements.txt

## 🔒 Security Notes

- JWT tokens expire after 30 minutes (configurable)
- Passwords are hashed using bcrypt
- All API endpoints (except auth) require authentication
- Users can only access their own chats
- Environment variables should never be committed to Git

## 📈 Future Enhancements

- [ ] Chat history persistence
- [ ] File type expansion (DOCX, CSV, etc.)
- [ ] Multi-language support
- [ ] Advanced search filters
- [ ] Chat sharing functionality
- [ ] Usage analytics dashboard

## 🧾 Deliverables
- ✅ **GitHub Repository** (Open access)  
- ✅ **Demo Video**  
- ✅ **Complete Documentation**
- ✅ **Production Deployment**

## 🧑‍💻 Author
**N. Karthik Sagar**  
[GitHub](https://github.com/karthiksagarn) | [LinkedIn](https://linkedin.com/in/karthik-sagar-nallagula) | [Portfolio](https://karthiknallagula.com/)

## 📄 License
This project is open source and available under the MIT License.

---

**Built with ❤️ using FastAPI, React, MongoDB, Pinecone, and OpenAI**
