
import os
import shutil
import uuid
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict

# --- LangChain Imports ---
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains.retrieval import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

# --- Environment Setup ---
from dotenv import load_dotenv
load_dotenv()
# This ensures the API key is loaded from your .env file
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

# --- Constants ---
# Base directory to store all chat-specific databases
ROOT_DB_DIR = "all_chat_dbs"
UPLOAD_DIR = "uploaded_files"
os.makedirs(ROOT_DB_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- Model Selection ---
OPENAI_EMBED_MODEL = "text-embedding-3-small"
OPENAI_LLM_MODEL = "gpt-4o-mini"

# --- App Initialization ---
app = FastAPI(
    title="Multi-Chat RAG API (OpenAI)",
    description="API for a RAG system using OpenAI that supports multiple chat sessions."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global In-Memory Chain Cache ---
# Caches active RAG chains to avoid reloading from disk on every query
chain_cache: Dict[str, any] = {}

# --- Helper Functions ---

def get_chat_db_path(chat_id: str) -> str:
    """Returns the specific database path for a given chat ID."""
    return os.path.join(ROOT_DB_DIR, chat_id)

def get_chat_metadata_path(chat_id: str) -> str:
    """Returns the path to the chat's metadata file."""
    return os.path.join(ROOT_DB_DIR, chat_id, "metadata.json")

def get_embeddings_model():
    """Initializes and returns the OpenAI embeddings model."""
    return OpenAIEmbeddings(model=OPENAI_EMBED_MODEL)

def get_llm():
    """Initializes and returns the OpenAI LLM."""
    # The API key is automatically read from the environment variable
    return ChatOpenAI(model=OPENAI_LLM_MODEL, temperature=0.1)

def initialize_rag_chain(chat_id: str):
    """Initializes and returns a RAG chain for a specific chat_id."""
    if chat_id in chain_cache:
        return chain_cache[chat_id]

    db_path = get_chat_db_path(chat_id)
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Chat database not found.")

    try:
        embeddings = get_embeddings_model()
        llm = get_llm()

        vectorstore = Chroma(persist_directory=db_path, embedding_function=embeddings)
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
        
        chain_cache[chat_id] = chain  # Cache the chain
        print(f"Initialized and cached chain for chat_id: {chat_id}")
        return chain
    except Exception as e:
        print(f"Error initializing chain for {chat_id}: {e}")
        # This could be an API key error
        if "api_key" in str(e).lower():
             raise HTTPException(status_code=500, detail="Error initializing RAG chain: Invalid or missing OpenAI API key.")
        raise HTTPException(status_code=500, detail=f"Error initializing RAG chain: {e}")


# --- Pydantic Models ---
class CreateChatRequest(BaseModel):
    name: str

class QueryRequest(BaseModel):
    query: str

class ChatMetadata(BaseModel):
    chat_id: str
    name: str
    created_at: str # Using str for simplicity
    doc_count: int = 0

# --- API Endpoints ---

@app.post("/create_chat", response_model=ChatMetadata)
async def create_chat(request: CreateChatRequest):
    """Creates a new, empty chat session."""
    chat_id = str(uuid.uuid4())
    chat_db_path = get_chat_db_path(chat_id)
    os.makedirs(chat_db_path, exist_ok=True)
    
    metadata = ChatMetadata(
        chat_id=chat_id,
        name=request.name,
        created_at=str(uuid.uuid4()), # Placeholder for creation time
    )
    
    # Save metadata
    with open(get_chat_metadata_path(chat_id), "w") as f:
        json.dump(metadata.model_dump(), f)
        
    return metadata

@app.get("/list_chats", response_model=List[ChatMetadata])
async def list_chats():
    """Lists all available chat sessions."""
    chats = []
    if not os.path.exists(ROOT_DB_DIR):
        return []
        
    for chat_id in os.listdir(ROOT_DB_DIR):
        chat_dir = get_chat_db_path(chat_id)
        metadata_path = get_chat_metadata_path(chat_id)
        if os.path.isdir(chat_dir) and os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r") as f:
                    data = json.load(f)
                    chats.append(ChatMetadata(**data))
            except Exception as e:
                print(f"Error reading metadata for {chat_id}: {e}")
    return chats

@app.post("/upload/{chat_id}")
async def upload_documents(chat_id: str, files: List[UploadFile] = File(...)):
    """Handles ingestion of documents *for a specific chat*."""
    chat_db_path = get_chat_db_path(chat_id)
    metadata_path = get_chat_metadata_path(chat_id)
    
    if not os.path.exists(chat_db_path):
        raise HTTPException(status_code=4.04, detail="Chat session not found.")

    # Invalidate cache for this chat if it exists
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
                continue # Skip unsupported file types
            docs.extend(loader.load())
        except Exception as e:
            print(f"Error loading {path}: {e}")
            os.remove(path) # Clean up
            raise HTTPException(status_code=400, detail=f"Error processing file {path}: {e}")
        finally:
            # Clean up uploaded file
            if os.path.exists(path):
                os.remove(path)

    if not docs:
        raise HTTPException(status_code=400, detail="No valid text or PDF documents uploaded.")

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)

    try:
        embeddings = get_embeddings_model()
        # Create or update the persistent vector store *for this chat*
        vectorstore = Chroma.from_documents(
            documents=splits, 
            embedding=embeddings, 
            persist_directory=chat_db_path
        )
        vectorstore.persist()
    except Exception as e:
        print(f"Error creating vector store: {e}")
        if "api_key" in str(e).lower():
             raise HTTPException(status_code=500, detail="Vector store creation failed: Invalid or missing OpenAI API key.")
        raise HTTPException(status_code=500, detail=f"Error creating vector store: {e}")

    
    # Update metadata
    doc_count = 0
    metadata_data = {}
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            metadata_data = json.load(f)
            doc_count = metadata_data.get("doc_count", 0)
            
    doc_count += len(docs)
    metadata_data["doc_count"] = doc_count
    
    with open(metadata_path, "w") as f:
        json.dump(metadata_data, f)
    
    return {
        "message": f"Successfully uploaded {len(files)} files to chat '{chat_id}'.",
        "documents_loaded": len(docs),
        "chunks_created": len(splits),
        "total_docs_in_chat": doc_count
    }

@app.post("/query/{chat_id}")
async def handle_query(chat_id: str, request: QueryRequest):
    """Accepts a user query for a specific chat and returns a synthesized answer."""
    try:
        chain = initialize_rag_chain(chat_id)
    except HTTPException as e:
        # Pass the HTTPException (e.g., 404, 500) directly to the client
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
        if "api_key" in str(e).lower():
            raise HTTPException(status_code=500, detail="Query failed: Invalid or missing OpenAI API key.")
        return HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.delete("/delete_chat/{chat_id}")
async def delete_chat(chat_id: str):
    """Deletes a chat session and its associated database."""
    chat_db_path = get_chat_db_path(chat_id)
    
    if chat_id in chain_cache:
        del chain_cache[chat_id]
        
    if os.path.exists(chat_db_path):
        shutil.rmtree(chat_db_path)
        return {"message": f"Successfully deleted chat {chat_id}."}
    else:
        raise HTTPException(status_code=404, detail="Chat session not found.")
