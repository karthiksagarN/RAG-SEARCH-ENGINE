import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "rag_search_engine"

if not MONGO_URI:
    raise ValueError("No MONGO_URI found in environment variables")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def get_db():
    return db
