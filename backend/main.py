import os
import uuid
import shutil
from typing import List, Dict, Optional
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from pymongo.database import Database

# --- LangChain Imports ---
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains.retrieval import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from pinecone import Pinecone, ServerlessSpec

# --- Internal Imports ---
from database import get_db
from models import User
from auth import (
    get_current_user,
    create_access_token,
    get_password_hash,
    verify_password,
    Token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from datetime import timedelta

# --- Environment Setup ---
from dotenv import load_dotenv
load_dotenv()

# --- Constants ---
UPLOAD_DIR = "uploaded_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

OPENAI_EMBED_MODEL = "text-embedding-3-small"
OPENAI_LLM_MODEL = "gpt-4o-mini"
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

if not PINECONE_API_KEY or not PINECONE_INDEX_NAME:
    raise ValueError("PINECONE_API_KEY and PINECONE_INDEX_NAME must be set in environment variables")

# --- App Initialization ---
app = FastAPI(
    title="Multi-Chat RAG API (MongoDB + Pinecone)",
    description="API for a RAG system using OpenAI, MongoDB, and Pinecone."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global In-Memory Chain Cache ---
chain_cache: Dict[str, any] = {}

# --- Helper Functions ---

def get_embeddings_model():
    return OpenAIEmbeddings(model=OPENAI_EMBED_MODEL)

def get_llm():
    return ChatOpenAI(model=OPENAI_LLM_MODEL, temperature=0.1)

def get_vectorstore(namespace: str):
    embeddings = get_embeddings_model()
    return PineconeVectorStore(
        index_name=PINECONE_INDEX_NAME,
        embedding=embeddings,
        namespace=namespace
    )

def initialize_rag_chain(chat_id: str):
    if chat_id in chain_cache:
        return chain_cache[chat_id]

    try:
        llm = get_llm()
        vectorstore = get_vectorstore(namespace=chat_id)
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

        prompt_template = """
        Using these documents, answer the user's question succinctly.
        If the answer is not in the documents, say so.
        
        Context:
        {context}
        
        Question:
        {input}
        
        Answer:
        """
        prompt = ChatPromptTemplate.from_template(prompt_template)
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        chain = create_retrieval_chain(retriever, question_answer_chain)
        
        chain_cache[chat_id] = chain
        print(f"Initialized and cached chain for chat_id: {chat_id}")
        return chain
    except Exception as e:
        print(f"Error initializing chain for {chat_id}: {e}")
        if "api_key" in str(e).lower():
             raise HTTPException(status_code=500, detail="Error initializing RAG chain: Invalid or missing API key.")
        raise HTTPException(status_code=500, detail=f"Error initializing RAG chain: {e}")

# --- Pydantic Models ---
class CreateChatRequest(BaseModel):
    name: str

class QueryRequest(BaseModel):
    query: str

class ChatMetadata(BaseModel):
    chat_id: str
    name: str
    created_at: str
    doc_count: int = 0
    user_id: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str

# --- API Endpoints ---

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Database = Depends(get_db)):
    if db.users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = {"username": user.username, "hashed_password": hashed_password}
    db.users.insert_one(new_user)
    return {"message": "User created successfully"}

@app.post("/auth/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Database = Depends(get_db)):
    user_data = db.users.find_one({"username": form_data.username})
    if not user_data or not verify_password(form_data.password, user_data["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "id": current_user.id}

@app.post("/create_chat", response_model=ChatMetadata)
async def create_chat(request: CreateChatRequest, current_user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    chat_id = str(uuid.uuid4())
    
    chat_doc = {
        "chat_id": chat_id,
        "name": request.name,
        "created_at": datetime.utcnow().isoformat(),
        "doc_count": 0,
        "user_id": current_user.id
    }
    
    db.chats.insert_one(chat_doc)
    
    return ChatMetadata(**chat_doc)

@app.get("/list_chats", response_model=List[ChatMetadata])
async def list_chats(current_user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    chats_cursor = db.chats.find({"user_id": current_user.id})
    chats = []
    for chat in chats_cursor:
        chats.append(ChatMetadata(**chat))
    return chats

@app.post("/upload/{chat_id}")
async def upload_documents(chat_id: str, files: List[UploadFile] = File(...), current_user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    # Verify chat ownership
    chat = db.chats.find_one({"chat_id": chat_id, "user_id": current_user.id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    # Invalidate cache
    if chat_id in chain_cache:
        del chain_cache[chat_id]

    file_paths = []
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{file.filename}")
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        file_paths.append(file_path)

    docs = []
    for path in file_paths:
        try:
            if path.endswith(".pdf"):
                loader = PyPDFLoader(path)
            elif path.endswith(".txt"):
                loader = TextLoader(path)
            else:
                continue
            docs.extend(loader.load())
        except Exception as e:
            print(f"Error loading {path}: {e}")
        finally:
            if os.path.exists(path):
                os.remove(path)

    if not docs:
        raise HTTPException(status_code=400, detail="No valid text or PDF documents uploaded.")

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)

    try:
        vectorstore = get_vectorstore(namespace=chat_id)
        vectorstore.add_documents(splits)
    except Exception as e:
        print(f"Error creating vector store: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading to Pinecone: {e}")

    # Update doc count
    new_count = chat.get("doc_count", 0) + len(docs)
    db.chats.update_one({"chat_id": chat_id}, {"$set": {"doc_count": new_count}})
    
    return {
        "message": f"Successfully uploaded {len(files)} files to chat '{chat_id}'.",
        "documents_loaded": len(docs),
        "chunks_created": len(splits),
        "total_docs_in_chat": new_count
    }

@app.post("/query/{chat_id}")
async def handle_query(chat_id: str, request: QueryRequest, current_user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    # Verify chat ownership
    chat = db.chats.find_one({"chat_id": chat_id, "user_id": current_user.id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    try:
        chain = initialize_rag_chain(chat_id)
    except HTTPException as e:
        raise e
    
    if not chain:
         raise HTTPException(status_code=404, detail="Chat chain not found or initialized.")

    try:
        response = await chain.ainvoke({"input": request.query})
        return {
            "query": request.query,
            "answer": response["answer"],
            "context_documents": [doc.page_content for doc in response["context"]]
        }
    except Exception as e:
        print(f"Error processing query: {e}")
        return HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.delete("/delete_chat/{chat_id}")
async def delete_chat(chat_id: str, current_user: User = Depends(get_current_user), db: Database = Depends(get_db)):
    chat = db.chats.find_one({"chat_id": chat_id, "user_id": current_user.id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    
    if chat_id in chain_cache:
        del chain_cache[chat_id]
        
    # Delete from Pinecone
    try:
        vectorstore = get_vectorstore(namespace=chat_id)
        vectorstore.delete(delete_all=True)
    except Exception as e:
        print(f"Error deleting from Pinecone: {e}")
        # Continue to delete metadata even if Pinecone fails
        
    db.chats.delete_one({"chat_id": chat_id})
    return {"message": f"Successfully deleted chat {chat_id}."}
