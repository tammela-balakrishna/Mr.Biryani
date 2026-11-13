# Mr. BIRIYANI — RAG Assistant Architecture

**Status: Planned architecture only.** This document defines the target RAG (retrieval-augmented generation) assistant. It does not claim that embeddings, vector search, model calls, chatbot UI, or ingestion jobs are implemented.

## 1. Product scope

Provide a conversational assistant across the React website and React Native app, backed by one shared chatbot service in the existing Node.js/Express backend.

Initial customer use cases:
- Answer menu questions using approved menu data (ingredients, spice level, allergens where verified, portion details, availability and prices).
- Explain ordering, takeaway/delivery, reservation and cancellation policies.
- Help users navigate the app and understand order/reservation statuses.
- Retrieve public restaurant information, opening hours, branch contact details and FAQs.

Authenticated, permission-scoped use cases may later include a customer's own order/reservation status and staff operational knowledge. These must use live domain APIs and authorization checks, not rely on indexed private records.

Out of scope for the first release: autonomous refunds, order placement, table allocation, payment actions, inventory changes, or any other transaction executed solely from a generated answer. The assistant may guide a user to the relevant verified workflow.

## 2. Shared architecture

```text
React Website ───────┐
                     ├── HTTPS /api/v1/chat/* ── Express Chat Module
React Native App ────┘                            │
                                                  ├── Identity + seven-role RBAC
                                                  ├── Conversation/session policy
                                                  ├── Query classification and safety
                                                  ├── Retrieval orchestration
                                                  │      ├── PostgreSQL + pgvector
                                                  │      ├── approved public documents
                                                  │      └── live domain-service tools
                                                  ├── LLM provider adapter
                                                  └── citations, feedback, audit
```

PostgreSQL remains the system of record. Use pgvector as the initial vector store to avoid introducing another database before scale requires it. Keep embedding and LLM providers behind adapters so models can be changed without changing client contracts. Redis/queue workers may be introduced for ingestion, rate limits and short-lived caching when justified.

## 3. RAG ingestion pipeline

1. **Sources:** Admin-approved FAQs, restaurant policies, menu descriptions, allergen information verified by the restaurant, branch information and help documentation.
2. **Connectors:** Explicit allowlist of source types; no arbitrary URL crawling or unreviewed user uploads in the first release.
3. **Normalization:** Extract text and metadata; remove scripts/boilerplate; preserve source title, URI, locale, branch scope, visibility, version and effective dates.
4. **Chunking:** Split by semantic headings/sections with bounded token size and overlap; keep menu items and policy clauses intact where possible.
5. **Embedding:** Generate vectors using a configurable embedding provider and record model/version/dimensions.
6. **Indexing:** Store chunks, metadata and vectors in PostgreSQL/pgvector with indexes selected from measured corpus size and query patterns.
7. **Lifecycle:** Deduplicate by content hash; re-index changed documents; deactivate deleted/expired sources; retain ingestion status and audit history.
8. **Quality:** Run retrieval tests and approval checks before publishing a new knowledge version.

Never index secrets, credentials, payment data, raw card data, private customer records or unrestricted staff records into the general knowledge corpus.

## 4. Query and answer pipeline

1. Authenticate when the request targets a private feature; allow anonymous access only to explicitly public knowledge.
2. Apply rate limits, input-size limits and abuse controls.
3. Classify intent and choose public knowledge retrieval, authenticated live-domain lookup, or a safe refusal/clarification.
4. Embed the query and retrieve relevant chunks using metadata filters; optionally combine vector similarity with PostgreSQL full-text search (hybrid retrieval).
5. Enforce visibility, locale and branch filters before content reaches the model. Never rely on prompt instructions as access control.
6. Re-rank a bounded candidate set when evaluation demonstrates benefit.
7. Build a grounded prompt containing only permitted retrieved context and clear instructions to ignore instructions embedded in retrieved documents.
8. Generate a concise answer with source references; state when the knowledge base does not contain a reliable answer.
9. Return answer, citations, conversation/message identifiers and safe suggested next steps.
10. Record privacy-minimized telemetry, latency, token usage, retrieval scores, model/version and feedback. Do not log secrets or unnecessary personal data.

For order/reservation status, call the existing domain service with the authenticated user identity and enforce ownership/branch policy on every request. Do not retrieve private status from vector search.

## 5. Authorization and data isolation

- Public knowledge is explicitly marked public and can be queried without a user session.
- Customer-private queries can access only that authenticated customer's records through domain services.
- Waiter, Receptionist, Captain, Cashier and Manager access follows the existing permission, branch and assignment scopes.
- Admin-only operational knowledge is never included in customer or general staff retrieval.
- Apply authorization filters at retrieval time and again before tool execution.
- Never accept role, user ID, branch ID or permission claims supplied by the client as authoritative.
- Keep conversations private to their owner unless an explicitly authorized support/audit workflow applies.
- Define retention, deletion, export and consent policy before production rollout.

The chatbot does not grant permissions and does not bypass the seven-role RBAC system.

## 6. API contract (proposed)

All endpoints remain under the shared `/api/v1` API:
- `POST /chat/sessions` — create a conversation.
- `GET /chat/sessions` — list the current user's conversations.
- `GET /chat/sessions/:sessionId/messages` — retrieve an owned conversation.
- `POST /chat/sessions/:sessionId/messages` — submit a message; response may stream using SSE if supported by deployment.
- `POST /chat/messages/:messageId/feedback` — submit helpful/not-helpful feedback.
- Admin-only endpoints for knowledge sources, ingestion jobs, publish/rollback and retrieval evaluation.

The exact OpenAPI schema, streaming protocol, pagination, error envelope and retention behavior must be finalized before implementation. Session/message endpoints must enforce owner scope. Admin knowledge endpoints require explicit permissions such as `chat.knowledge.read`, `chat.knowledge.manage` and `chat.knowledge.publish`.

## 7. Suggested data model

- `chat_sessions`: id, owner_user_id nullable for anonymous sessions, channel, locale, created_at, updated_at, expires_at.
- `chat_messages`: id, session_id, role, content, status, model metadata, token usage, created_at.
- `chat_message_sources`: message_id, knowledge_chunk_id, source snapshot/title/URI and retrieval score.
- `knowledge_sources`: id, source_type, source_uri, title, visibility, branch_id nullable, locale, content_hash, version, status, effective dates, created_by, timestamps.
- `knowledge_chunks`: id, source_id, chunk_index, content, metadata, embedding vector, embedding_model, created_at.
- `knowledge_ingestion_jobs`: id, source_id, status, attempts, error_code, started_at, completed_at.
- `chat_feedback`: id, message_id, owner_user_id, rating, reason_code, created_at.

Use UUID keys, foreign keys, constraints, retention indexes and branch/visibility metadata. Confirm pgvector extension/version and vector dimensions before migrations. Do not duplicate order, payment or reservation tables in chatbot storage.

## 8. Security, reliability and cost controls

- Prompt-injection defense: treat retrieved documents and user input as untrusted data; never execute instructions found in them.
- Tool allowlist: expose only narrowly scoped read-only tools initially; validate arguments and authorize every call server-side.
- No model-generated SQL, arbitrary code execution, arbitrary URL fetch or unrestricted database access.
- Redact personal data from prompts and logs; avoid sending unnecessary customer identifiers to external model providers.
- Provider timeouts, bounded retries, circuit breakers, request cancellation and graceful fallback.
- Rate limits by IP/user/device, quotas, maximum context/output tokens and per-role policies.
- Cache only public, versioned retrieval results; never share personalized answers across users.
- Keep model keys in server-side secret management; never bundle keys in web/mobile apps.
- Monitor answer latency, retrieval hit rate, citation coverage, groundedness, refusal rate, user feedback, token cost and provider errors.

## 9. Testing and evaluation

- Curated golden question set covering menu, policies, branch FAQs, multilingual/typo queries and unknown questions.
- Retrieval precision/recall and source freshness checks.
- Groundedness and citation correctness; test that unsupported answers are withheld.
- RBAC and tenant/branch isolation tests, including cross-customer order-status attempts.
- Prompt injection, jailbreak, data-exfiltration and malicious-document tests.
- Load, timeout, provider outage, duplicate request and streaming disconnect tests.
- Regression tests after every embedding/model/prompt/chunking/index change.
- Human review by restaurant operators for menu, allergens, pricing and policy answers.

## 10. Phased implementation

1. **Decision and contract:** approve use cases, public/private boundaries, provider, languages, retention and OpenAPI.
2. **Knowledge foundation:** pgvector migration, source registry, ingestion worker, chunking, embeddings and admin publishing.
3. **Backend RAG service:** retrieval, filtering, prompt assembly, model adapter, citations, limits and observability.
4. **Public customer assistant:** website widget and mobile chat screen for menu/FAQ/policies only.
5. **Authenticated read-only tools:** own order/reservation status and staff-specific help after security review.
6. **Evaluation and rollout:** offline benchmark, red-team, pilot, monitoring and gradual release.

## 11. Acceptance criteria

- Both clients use the same backend chat API and conversation contract.
- Public answers cite approved sources and clearly acknowledge missing information.
- Private data is obtained only through authorized live services, never general vector retrieval.
- All seven roles follow existing branch, ownership and assignment policies.
- No transactional action is executed solely on model output.
- Admin can version, publish, deactivate and roll back knowledge sources with audit history.
- Automated retrieval, grounding, privacy, RBAC, abuse and reliability tests pass.
- Feature flags and kill switch can disable the assistant without affecting ordering/POS operations.

## 12. Current implementation status

Architecture/specification only. No RAG chatbot UI, chat endpoints, pgvector migration, ingestion pipeline, embeddings, LLM provider integration, streaming, evaluation harness or production knowledge base is claimed implemented.
