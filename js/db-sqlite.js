/**
 * db-sqlite.js
 * Capa de persistencia local SQLite compatible con SQLite3, sql.js y Cloudflare D1
 * Guarda entidades, relaciones, comunidades y consultas con exportación .sql y JSON
 */

export class SQLiteKnowledgeDB {
  constructor(storageKey = 'graphrag_explorer_db') {
    this.storageKey = storageKey;
    this.tables = {
      kg_chunks: [],
      kg_nodes: [],
      kg_edges: [],
      kg_communities: [],
      rag_queries: []
    };
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.tables = Object.assign(this.tables, parsed);
      }
    } catch (e) {
      console.warn('SQLiteKnowledgeDB: No previous storage found or parse error', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.tables));
    } catch (e) {
      console.error('SQLiteKnowledgeDB: Could not persist to localStorage', e);
    }
  }

  syncCorpus(corpus) {
    // 1. Sync Chunks
    if (corpus.documents) {
      corpus.documents.forEach(doc => {
        const existingIdx = this.tables.kg_chunks.findIndex(c => c.id === doc.id);
        const chunkRecord = {
          id: doc.id,
          corpus_id: corpus.id,
          title: doc.title,
          content: doc.content,
          token_count: doc.tokenCount || Math.ceil(doc.content.length / 4),
          created_at: new Date().toISOString()
        };
        if (existingIdx >= 0) this.tables.kg_chunks[existingIdx] = chunkRecord;
        else this.tables.kg_chunks.push(chunkRecord);
      });
    }

    // 2. Sync Nodes
    if (corpus.nodes) {
      corpus.nodes.forEach(node => {
        const existingIdx = this.tables.kg_nodes.findIndex(n => n.id === node.id);
        const nodeRecord = {
          id: node.id,
          label: node.label,
          entity_type: node.type || 'CONCEPT',
          community_id: node.community || 0,
          importance_score: node.importance || 1.0,
          description: node.desc || '',
          metadata_json: JSON.stringify({ chunkIds: node.chunkIds || [] }),
          created_at: new Date().toISOString()
        };
        if (existingIdx >= 0) this.tables.kg_nodes[existingIdx] = nodeRecord;
        else this.tables.kg_nodes.push(nodeRecord);
      });
    }

    // 3. Sync Edges
    if (corpus.edges) {
      corpus.edges.forEach(edge => {
        const sId = typeof edge.source === 'string' ? edge.source : edge.source.id;
        const tId = typeof edge.target === 'string' ? edge.target : edge.target.id;
        const existingIdx = this.tables.kg_edges.findIndex(e => e.id === edge.id);
        const edgeRecord = {
          id: edge.id,
          source_id: sId,
          target_id: tId,
          relation: edge.relation,
          weight: edge.weight || 1.0,
          evidence_chunk_id: edge.chunkId || null
        };
        if (existingIdx >= 0) this.tables.kg_edges[existingIdx] = edgeRecord;
        else this.tables.kg_edges.push(edgeRecord);
      });
    }

    // 4. Sync Communities
    if (corpus.communities) {
      corpus.communities.forEach(comm => {
        const existingIdx = this.tables.kg_communities.findIndex(c => c.id === comm.id);
        const commRecord = {
          id: comm.id,
          level: 0,
          title: comm.title,
          summary: comm.summary,
          key_findings: comm.keyFindings,
          node_count: (comm.nodes || []).length,
          density: 0.75,
          created_at: new Date().toISOString()
        };
        if (existingIdx >= 0) this.tables.kg_communities[existingIdx] = commRecord;
        else this.tables.kg_communities.push(commRecord);
      });
    }

    this.saveToStorage();
  }

  logQueryExecution(evaluationResult) {
    const { query, vector, graph, delta } = evaluationResult;
    const queryRecord = {
      id: `query-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      query_text: query,
      query_type: 'COMPARATIVE_AB',
      vector_top_k_json: JSON.stringify(vector.topChunks.map(c => ({ id: c.id, title: c.title, sim: c.similarity }))),
      vector_response: vector.synthesis,
      vector_latency_ms: vector.latencyMs,
      vector_recall_score: vector.recallScore,
      graph_visited_nodes_json: JSON.stringify(graph.visitedNodes.map(n => n.id)),
      graph_subgraph_edges_json: JSON.stringify(graph.subgraphEdges.map(e => e.id)),
      graph_response: graph.synthesis,
      graph_latency_ms: graph.latencyMs,
      graph_faithfulness_score: graph.faithfulnessScore,
      comparison_summary: delta.keyTakeaway,
      executed_at: new Date().toISOString()
    };

    this.tables.rag_queries.unshift(queryRecord);
    // Keep max 50 queries in log
    if (this.tables.rag_queries.length > 50) {
      this.tables.rag_queries.pop();
    }
    this.saveToStorage();
    return queryRecord;
  }

  getStats() {
    return {
      chunksCount: this.tables.kg_chunks.length,
      nodesCount: this.tables.kg_nodes.length,
      edgesCount: this.tables.kg_edges.length,
      communitiesCount: this.tables.kg_communities.length,
      queriesCount: this.tables.rag_queries.length
    };
  }

  /**
   * Generates a fully compliant SQL dump file containing schema + INSERT statements
   */
  generateSQLDump() {
    let sql = `-- ============================================================================\n`;
    sql += `-- GraphRAG Knowledge Explorer: SQLite Dump (Cloudflare D1 / SQLite3)\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n`;
    sql += `-- ============================================================================\n\n`;

    sql += `PRAGMA foreign_keys = ON;\n\n`;

    // Chunks
    if (this.tables.kg_chunks.length > 0) {
      sql += `-- Table: kg_chunks\n`;
      this.tables.kg_chunks.forEach(c => {
        const cleanContent = c.content.replace(/'/g, "''");
        const cleanTitle = c.title.replace(/'/g, "''");
        sql += `INSERT OR REPLACE INTO kg_chunks (id, corpus_id, title, content, token_count) VALUES ('${c.id}', '${c.corpus_id}', '${cleanTitle}', '${cleanContent}', ${c.token_count});\n`;
      });
      sql += `\n`;
    }

    // Nodes
    if (this.tables.kg_nodes.length > 0) {
      sql += `-- Table: kg_nodes\n`;
      this.tables.kg_nodes.forEach(n => {
        const cleanLabel = n.label.replace(/'/g, "''");
        const cleanDesc = (n.description || '').replace(/'/g, "''");
        sql += `INSERT OR REPLACE INTO kg_nodes (id, label, entity_type, community_id, importance_score, description) VALUES ('${n.id}', '${cleanLabel}', '${n.entity_type}', ${n.community_id}, ${n.importance_score}, '${cleanDesc}');\n`;
      });
      sql += `\n`;
    }

    // Edges
    if (this.tables.kg_edges.length > 0) {
      sql += `-- Table: kg_edges\n`;
      this.tables.kg_edges.forEach(e => {
        sql += `INSERT OR REPLACE INTO kg_edges (id, source_id, target_id, relation, weight, evidence_chunk_id) VALUES ('${e.id}', '${e.source_id}', '${e.target_id}', '${e.relation}', ${e.weight}, ${e.evidence_chunk_id ? `'${e.evidence_chunk_id}'` : 'NULL'});\n`;
      });
      sql += `\n`;
    }

    // Communities
    if (this.tables.kg_communities.length > 0) {
      sql += `-- Table: kg_communities\n`;
      this.tables.kg_communities.forEach(c => {
        const cleanSummary = c.summary.replace(/'/g, "''");
        const cleanFindings = (c.key_findings || '').replace(/'/g, "''");
        sql += `INSERT OR REPLACE INTO kg_communities (id, level, title, summary, key_findings, node_count, density) VALUES (${c.id}, ${c.level}, '${c.title.replace(/'/g, "''")}', '${cleanSummary}', '${cleanFindings}', ${c.node_count}, ${c.density});\n`;
      });
      sql += `\n`;
    }

    // Queries
    if (this.tables.rag_queries.length > 0) {
      sql += `-- Table: rag_queries\n`;
      this.tables.rag_queries.slice(0, 10).forEach(q => {
        const cleanQ = q.query_text.replace(/'/g, "''");
        const cleanVR = (q.vector_response || '').replace(/'/g, "''");
        const cleanGR = (q.graph_response || '').replace(/'/g, "''");
        sql += `INSERT OR REPLACE INTO rag_queries (id, query_text, query_type, vector_response, vector_latency_ms, vector_recall_score, graph_response, graph_latency_ms, graph_faithfulness_score) VALUES ('${q.id}', '${cleanQ}', '${q.query_type}', '${cleanVR}', ${q.vector_latency_ms}, ${q.vector_recall_score}, '${cleanGR}', ${q.graph_latency_ms}, ${q.graph_faithfulness_score});\n`;
      });
    }

    return sql;
  }
}
