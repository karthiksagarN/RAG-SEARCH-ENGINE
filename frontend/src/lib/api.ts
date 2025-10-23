import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const api = axios.create({
  baseURL: '/api', // proxied by Vite → http://localhost:8000
});

export interface Chat {
  chat_id: string;
  name: string;
  created_at: string;
  doc_count: number;
}

export const apiCreateChat = (name: string) =>
  api.post<Chat>('/create_chat', { name });

export const apiListChats = () => api.get<Chat[]>('/list_chats');

export const apiDeleteChat = (chatId: string) =>
  api.delete(`/delete_chat/${chatId}`);

export const apiUploadFiles = (chatId: string, files: File[]) => {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  return api.post(`/upload/${chatId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export interface QueryResponse {
  query: string;
  answer: string;
  context_documents: string[];
}

export const apiQuery = (chatId: string, query: string) =>
  api.post<QueryResponse>(`/query/${chatId}`, { query });