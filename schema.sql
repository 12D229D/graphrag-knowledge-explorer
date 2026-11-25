-- ============================================================================
-- Schema: GraphRAG & Temporal Knowledge Memory Explorer
-- SQLite 3.45+ / Cloudflare D1 Compatible
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Document Chunks (for Vector RAG comparison)
CREATE TABLE IF NOT EXISTS kg_chunks (
    id TEXT PRIMARY KEY,
    corpus_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    embedding_json TEXT, -- JSON array of floats for simulated vector
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Knowledge Graph Nodes (Entities)
CREATE TABLE IF NOT EXISTS kg_nodes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- e.g., 'SYSTEM', 'PROTOCOL', 'VULNERABILITY', 'PERSON', 'CONCEPT'
    community_id INTEGER NOT NULL DEFAULT 0,
    importance_score REAL DEFAULT 1.0,
    description TEXT,
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Knowledge Graph Edges (Directed Semantic Relationships)
CREATE TABLE IF NOT EXISTS kg_edges (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    timestamp_epoch INTEGER,
    valid_from TEXT,
    valid_to TEXT,
    evidence_chunk_id TEXT,
    FOREIGN KEY(source_id) REFERENCES kg_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY(target_id) REFERENCES kg_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY(evidence_chunk_id) REFERENCES kg_chunks(id) ON DELETE SET NULL
);

-- 4. Hierarchical Communities (Leiden / Louvain clustering)
CREATE TABLE IF NOT EXISTS kg_communities (
    id INTEGER PRIMARY KEY,
    level INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_findings TEXT,
    node_count INTEGER DEFAULT 0,
    density REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. RAG Evaluation Queries & Comparison Logs
CREATE TABLE IF NOT EXISTS rag_queries (
    id TEXT PRIMARY KEY,
    query_text TEXT NOT NULL,
    query_type TEXT NOT NULL, -- 'GLOBAL', 'LOCAL_MULTI_HOP', 'TEMPORAL'
    vector_top_k_json TEXT,
    vector_response TEXT,
    vector_latency_ms REAL,
    vector_recall_score REAL,
    graph_visited_nodes_json TEXT,
    graph_subgraph_edges_json TEXT,
    graph_response TEXT,
    graph_latency_ms REAL,
    graph_faithfulness_score REAL,
    comparison_summary TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_edges_source ON kg_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON kg_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON kg_nodes(entity_type);
CREATE INDEX IF NOT EXISTS idx_nodes_comm ON kg_nodes(community_id);
CREATE INDEX IF NOT EXISTS idx_chunks_corpus ON kg_chunks(corpus_id);
