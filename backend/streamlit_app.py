import streamlit as st
import requests
import os

# --- Configuration ---
BACKEND_URL = "http://127.0.0.1:8000"
UPLOAD_ENDPOINT = f"{BACKEND_URL}/upload"
QUERY_ENDPOINT = f"{BACKEND_URL}/query"

# --- Page Setup ---
st.set_page_config(
    page_title="Knowledge-base Search Engine",
    layout="wide"
)
st.title("📚 Knowledge-base Search Engine")
st.markdown("Based on the RAG architecture described in your project.")

# --- Main Application Logic ---
with st.sidebar:
    st.header("1. Upload Documents")
    st.markdown("Upload multiple `.txt` or `.pdf` files to build the knowledge base.")
    
    # Input: Multiple text/PDF documents [cite: 5]
    uploaded_files = st.file_uploader(
        "Choose your files", 
        accept_multiple_files=True, 
        type=["pdf", "txt"]
    )
    
    if st.button("Build Knowledge Base"):
        if uploaded_files:
            with st.spinner("Ingesting documents... This may take a moment."):
                # Prepare files for the API
                files_to_upload = []
                for f in uploaded_files:
                    files_to_upload.append(("files", (f.name, f.getvalue(), f.type)))
                
                try:
                    # Backend API to handle document ingestion [cite: 9]
                    response = requests.post(UPLOAD_ENDPOINT, files=files_to_upload)
                    if response.status_code == 200:
                        st.success(f"Success: {response.json().get('message')}")
                        st.json(response.json())
                    else:
                        st.error(f"Error: {response.text}")
                except Exception as e:
                    st.error(f"Failed to connect to backend: {e}")
        else:
            st.warning("Please upload at least one file.")

# --- Query Interface ---
st.header("2. Ask a Question")
st.markdown("Ask a question based on the documents you uploaded.")

# Initialize session state for chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display prior messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Input: User query 
user_query = st.chat_input("What is your question?")

if user_query:
    # Add user query to history
    st.session_state.messages.append({"role": "user", "content": user_query})
    with st.chat_message("user"):
        st.markdown(user_query)
    
    # Get answer from backend
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            try:
                # API call to get synthesized answer 
                response = requests.post(QUERY_ENDPOINT, json={"query": user_query})
                
                if response.status_code == 200:
                    answer_data = response.json()
                    answer = answer_data.get("answer", "No answer found.")
                    st.markdown(answer)
                    
                    # Optional: Display retrieved context
                    with st.expander("Show Retrieved Context"):
                        st.json(answer_data.get("context_documents", []))
                    
                    # Add assistant answer to history
                    st.session_state.messages.append({"role": "assistant", "content": answer})
                else:
                    st.error(f"Error: {response.text}")

            except Exception as e:
                st.error(f"Failed to connect to backend: {e}")