# Mr. BIRIYANI — React Website

React 19 + Vite customer website and staff/admin workspaces.

## Run the frontend

```bash
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` to the shared backend API base URL, for example `http://localhost:4000/api/v1`.

## RAG assistant

The floating assistant is mounted across non-authentication pages through `src/components/ChatbotWidget.jsx`. It sends questions to `POST /api/v1/chat` on the shared backend and displays answer source titles. It does not call an LLM provider directly and contains no model API key.

The assistant is informational only. It cannot place orders, modify reservations, access private customer records, or confirm live operational/payment status. The backend must be running with pgvector migrated, an OpenAI API key configured, and approved knowledge files ingested.

See [backend RAG setup](../backend/README.md#rag-chatbot-initial-implementation).
