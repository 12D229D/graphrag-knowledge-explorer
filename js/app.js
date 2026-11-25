/**
 * app.js
 * Controlador Principal de la SPA: Orquestación de Grafo, Recuperación Híbrida,
 * Interacción de UI, Auditoría SQLite y Microinteracciones
 */

import { CORPUS_DATASETS, extractKnowledgeGraphFromText } from './graph-extractor.js';
import { ForceGraphCanvas } from './force-canvas.js';
import { HybridRetriever } from './hybrid-retriever.js';
import { SQLiteKnowledgeDB } from './db-sqlite.js';

class GraphRAGApp {
  constructor() {
    this.currentCorpusKey = 'microservices';
    this.activeCorpus = CORPUS_DATASETS.microservices;
    
    // Core components
    this.db = new SQLiteKnowledgeDB();
    this.retriever = new HybridRetriever(this.activeCorpus);
    this.canvas = null;

    this.selectedNode = null;
    this.lastEvaluation = null;

    this.initDOM();
    this.initCanvas();
    this.loadCorpus(this.activeCorpus);
    this.bindEvents();
    this.renderSQLiteHistory();
  }

  initDOM() {
    this.dom = {
      corpusSelect: document.getElementById('corpusSelect'),
      corpusDescription: document.getElementById('corpusDescription'),
      customIngestSection: document.getElementById('customIngestSection'),
      customTextInput: document.getElementById('customTextInput'),
      btnExtractCustom: document.getElementById('btnExtractCustom'),
      
      statNodes: document.getElementById('statNodes'),
      statEdges: document.getElementById('statEdges'),
      statCommunities: document.getElementById('statCommunities'),
      statChunks: document.getElementById('statChunks'),
      documentList: document.getElementById('documentList'),

      queryInput: document.getElementById('queryInput'),
      btnRunQuery: document.getElementById('btnRunQuery'),
      presetQueriesContainer: document.getElementById('presetQueriesContainer'),
      canvasLegend: document.getElementById('canvasLegend'),
      btnClearHighlights: document.getElementById('btnClearHighlights'),
      btnResetView: document.getElementById('btnResetView'),
      btnExportSQL: document.getElementById('btnExportSQL'),
      btnDownloadSQLTab: document.getElementById('btnDownloadSQLTab'),

      // Tabs
      tabBtnComparison: document.getElementById('tabBtnComparison'),
      tabBtnInspector: document.getElementById('tabBtnInspector'),
      tabBtnSQLite: document.getElementById('tabBtnSQLite'),
      tabContentComparison: document.getElementById('tabContentComparison'),
      tabContentInspector: document.getElementById('tabContentInspector'),
      tabContentSQLite: document.getElementById('tabContentSQLite'),

      // Results
      vecLatency: document.getElementById('vecLatency'),
      vecRecall: document.getElementById('vecRecall'),
      vecResponse: document.getElementById('vecResponse'),
      graphLatency: document.getElementById('graphLatency'),
      graphFaith: document.getElementById('graphFaith'),
      graphResponse: document.getElementById('graphResponse'),
      deltaInsight: document.getElementById('deltaInsight'),

      // Inspector
      emptyInspectorNotice: document.getElementById('emptyInspectorNotice'),
      nodeDetailsContainer: document.getElementById('nodeDetailsContainer'),
      inspectLabel: document.getElementById('inspectLabel'),
      inspectType: document.getElementById('inspectType'),
      inspectDesc: document.getElementById('inspectDesc'),
      inspectCommunity: document.getElementById('inspectCommunity'),
      inspectScore: document.getElementById('inspectScore'),
      inspectId: document.getElementById('inspectId'),
      inspectDegree: document.getElementById('inspectDegree'),
      inspectRelationsList: document.getElementById('inspectRelationsList'),

      queryHistoryList: document.getElementById('queryHistoryList')
    };
  }

  initCanvas() {
    const canvasEl = document.getElementById('graphCanvas');
    this.canvas = new ForceGraphCanvas(canvasEl, {
      onNodeClick: (node) => this.inspectNode(node),
      onNodeHover: (node) => {
        // Optional subtle hover interaction
      }
    });
  }

  loadCorpus(corpus) {
    this.activeCorpus = corpus;
    this.retriever.setCorpus(corpus);
    this.db.syncCorpus(corpus);

    // Update canvas
    this.canvas.setData({
      nodes: corpus.nodes,
      edges: corpus.edges,
      communities: corpus.communities
    });

    // Update Stats & UI
    this.dom.corpusDescription.textContent = corpus.description;
    this.dom.statNodes.textContent = corpus.nodes.length;
    this.dom.statEdges.textContent = corpus.edges.length;
    this.dom.statCommunities.textContent = (corpus.communities || []).length;
    this.dom.statChunks.textContent = (corpus.documents || []).length;

    this.renderDocumentList();
    this.renderPresetQueries();
    this.renderLegend();
  }

  renderDocumentList() {
    const list = this.dom.documentList;
    list.innerHTML = '';
    (this.activeCorpus.documents || []).forEach(doc => {
      const item = document.createElement('div');
      item.style.padding = '0.35rem 0.5rem';
      item.style.background = 'var(--bg-secondary)';
      item.style.borderRadius = 'var(--radius-sm)';
      item.style.border = '1px solid var(--border-subtle)';
      item.innerHTML = `<strong>${doc.title}</strong><div style="color: var(--text-muted); font-size: 0.68rem; margin-top: 2px;">${doc.content.slice(0, 75)}...</div>`;
      list.appendChild(item);
    });
  }

  renderPresetQueries() {
    const container = this.dom.presetQueriesContainer;
    container.innerHTML = '';
    const presets = this.activeCorpus.presetQueries || [];

    presets.forEach(pq => {
      const chip = document.createElement('button');
      chip.className = 'query-chip';
      chip.textContent = pq.text;
      chip.title = pq.explanation;
      chip.addEventListener('click', () => {
        this.dom.queryInput.value = pq.text;
        this.runComparisonQuery(pq.text, pq);
      });
      container.appendChild(chip);
    });
  }

  renderLegend() {
    const legend = this.dom.canvasLegend;
    legend.innerHTML = '<div style="font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Filtrar Clúster</div>';
    const comms = this.activeCorpus.communities || [];

    comms.forEach(c => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      const col = this.canvas.communityColors[c.id] || this.canvas.communityColors.default;
      item.innerHTML = `
        <span class="legend-dot" style="background: ${col.fill}"></span>
        <span>#${c.id} ${c.title.slice(0, 18)}...</span>
      `;
      item.addEventListener('click', () => {
        this.canvas.filterCommunity(c.id);
      });
      legend.appendChild(item);
    });

    const resetItem = document.createElement('div');
    resetItem.className = 'legend-item';
    resetItem.innerHTML = `<span style="color: var(--accent-cyan); font-weight: 600;">Ver Todos</span>`;
    resetItem.addEventListener('click', () => {
      this.canvas.filterCommunity(null);
    });
    legend.appendChild(resetItem);
  }

  runComparisonQuery(queryText, presetInfo = null) {
    if (!queryText || queryText.trim().length === 0) return;

    // Switch to comparison tab
    this.switchTab('comparison');

    // Run hybrid evaluation
    const evaluation = this.retriever.evaluateComparison(queryText);
    this.lastEvaluation = evaluation;

    // Log in SQLite DB
    this.db.logQueryExecution(evaluation);
    this.renderSQLiteHistory();

    // Update UI Results
    this.dom.vecLatency.textContent = `${evaluation.vector.latencyMs} ms`;
    this.dom.vecRecall.textContent = `${(evaluation.vector.recallScore * 100).toFixed(0)}%`;
    this.dom.vecResponse.textContent = evaluation.vector.synthesis;

    this.dom.graphLatency.textContent = `${evaluation.graph.latencyMs} ms`;
    this.dom.graphFaith.textContent = `${(evaluation.graph.faithfulnessScore * 100).toFixed(0)}%`;
    this.dom.graphResponse.textContent = evaluation.graph.synthesis;

    this.dom.deltaInsight.innerHTML = `
      <strong>${evaluation.delta.accuracyAdvantage}</strong><br>
      ${evaluation.delta.keyTakeaway}
    `;

    // Highlight Graph Subgraph in Canvas
    const nodeIds = evaluation.graph.visitedNodes.map(n => n.id);
    const edgeIds = evaluation.graph.subgraphEdges.map(e => e.id);
    this.canvas.highlightPath(nodeIds, edgeIds);
    this.canvas.startSimulation();
  }

  inspectNode(node) {
    this.selectedNode = node;
    this.switchTab('inspector');

    this.dom.emptyInspectorNotice.style.display = 'none';
    this.dom.nodeDetailsContainer.style.display = 'flex';

    this.dom.inspectLabel.textContent = node.label;
    this.dom.inspectType.textContent = node.type || 'CONCEPT';
    this.dom.inspectDesc.textContent = node.desc || 'Sin descripción adicional.';
    this.dom.inspectCommunity.textContent = `#${node.community}`;
    this.dom.inspectScore.textContent = `${node.importance || 1.0}`;
    this.dom.inspectId.textContent = node.id;

    // Find incident edges
    const incidentEdges = this.activeCorpus.edges.filter(e => {
      const s = typeof e.source === 'string' ? e.source : e.source.id;
      const t = typeof e.target === 'string' ? e.target : e.target.id;
      return s === node.id || t === node.id;
    });

    this.dom.inspectDegree.textContent = incidentEdges.length;

    const list = this.dom.inspectRelationsList;
    list.innerHTML = '';
    incidentEdges.forEach(e => {
      const s = typeof e.source === 'string' ? e.source : e.source.id;
      const t = typeof e.target === 'string' ? e.target : e.target.id;
      const isOutgoing = s === node.id;
      const otherNodeId = isOutgoing ? t : s;
      const otherNode = this.activeCorpus.nodes.find(n => n.id === otherNodeId);

      const relEl = document.createElement('div');
      relEl.className = 'rel-item';
      relEl.innerHTML = `
        <span>${isOutgoing ? '➔' : '⬅'} [${e.relation}]</span>
        <span class="target">${otherNode?.label || otherNodeId}</span>
      `;
      list.appendChild(relEl);
    });

    // Highlight the inspected node and its incident edges on canvas
    this.canvas.highlightPath([node.id], incidentEdges.map(e => e.id));
  }

  renderSQLiteHistory() {
    const list = this.dom.queryHistoryList;
    if (!list) return;
    list.innerHTML = '';

    const queries = this.db.tables.rag_queries || [];
    if (queries.length === 0) {
      list.innerHTML = '<div style="color: var(--text-muted); padding: 0.5rem;">No hay consultas registradas aún.</div>';
      return;
    }

    queries.slice(0, 10).forEach(q => {
      const item = document.createElement('div');
      item.style.background = 'var(--bg-secondary)';
      item.style.borderRadius = 'var(--radius-sm)';
      item.style.padding = '0.45rem';
      item.style.border = '1px solid var(--border-subtle)';
      item.innerHTML = `
        <div style="font-weight: 600; color: var(--text-primary); font-size: 0.74rem;">${q.query_text}</div>
        <div style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 0.68rem; margin-top: 2px;">
          Vector: ${q.vector_latency_ms}ms | Graph: ${q.graph_latency_ms}ms (Fiel: ${(q.graph_faithfulness_score * 100).toFixed(0)}%)
        </div>
      `;
      list.appendChild(item);
    });
  }

  switchTab(tabName) {
    const {
      tabBtnComparison, tabBtnInspector, tabBtnSQLite,
      tabContentComparison, tabContentInspector, tabContentSQLite
    } = this.dom;

    [tabBtnComparison, tabBtnInspector, tabBtnSQLite].forEach(b => b.classList.remove('active'));
    tabContentComparison.style.display = 'none';
    tabContentInspector.style.display = 'none';
    tabContentSQLite.style.display = 'none';

    if (tabName === 'comparison') {
      tabBtnComparison.classList.add('active');
      tabContentComparison.style.display = 'flex';
    } else if (tabName === 'inspector') {
      tabBtnInspector.classList.add('active');
      tabContentInspector.style.display = 'flex';
    } else if (tabName === 'sqlite') {
      tabBtnSQLite.classList.add('active');
      tabContentSQLite.style.display = 'flex';
      this.renderSQLiteHistory();
    }
  }

  downloadSQLDump() {
    const sqlContent = this.db.generateSQLDump();
    const blob = new Blob([sqlContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graphrag_knowledge_${this.activeCorpus.id || 'corpus'}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  bindEvents() {
    // Tab switching
    this.dom.tabBtnComparison.addEventListener('click', () => this.switchTab('comparison'));
    this.dom.tabBtnInspector.addEventListener('click', () => this.switchTab('inspector'));
    this.dom.tabBtnSQLite.addEventListener('click', () => this.switchTab('sqlite'));

    // Corpus selection
    this.dom.corpusSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      if (key === 'custom') {
        this.dom.customIngestSection.style.display = 'flex';
      } else {
        this.dom.customIngestSection.style.display = 'none';
        if (CORPUS_DATASETS[key]) {
          this.loadCorpus(CORPUS_DATASETS[key]);
        }
      }
    });

    // Custom text extraction
    this.dom.btnExtractCustom.addEventListener('click', () => {
      const text = this.dom.customTextInput.value.trim();
      if (text.length < 20) {
        alert('Por favor introduce un texto de al menos 20 caracteres para procesar.');
        return;
      }
      const customCorpus = extractKnowledgeGraphFromText(text, 'custom-corpus');
      this.loadCorpus(customCorpus);
    });

    // Run query button & enter key
    this.dom.btnRunQuery.addEventListener('click', () => {
      this.runComparisonQuery(this.dom.queryInput.value);
    });

    this.dom.queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.runComparisonQuery(this.dom.queryInput.value);
      }
    });

    // Clear highlights
    this.dom.btnClearHighlights.addEventListener('click', () => {
      this.canvas.clearPathHighlight();
    });

    // Reset View
    this.dom.btnResetView.addEventListener('click', () => {
      this.canvas.resetView();
      this.canvas.render();
    });

    // Export SQL
    this.dom.btnExportSQL.addEventListener('click', () => this.downloadSQLDump());
    this.dom.btnDownloadSQLTab.addEventListener('click', () => this.downloadSQLDump());
  }
}

// Initialize Application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GraphRAGApp();
});
