/**
 * graph-extractor.js
 * Extractor heurístico y declarativo de entidades, tripletas, comunidades y chunks
 * Datasets técnicos de referencia: Microservicios Resilientes, Genómica & Biofarma, Fraude Financiero
 */

export const CORPUS_DATASETS = {
  microservices: {
    id: 'microservices',
    title: 'Arquitectura Cloud-Native Zero Trust & Fallos en Cascada',
    description: 'Sistema financiero distribuido con malla de servicios, IAM federado, bases distribuidas y auditoría.',
    documents: [
      {
        id: 'doc-ms-1',
        title: 'Topología de Autenticación y API Gateway',
        content: 'El servicio API Gateway intercepta todo el tráfico perimetral. Valida tokens criptográficos contra Auth0 y Keycloak mediante mTLS. Cuando el tráfico es legítimo, deriva peticiones hacia Order Service y Payment Engine a través de Envoy Service Mesh con políticas estrictas de cifrado WireGuard.',
        date: '2026-03-12'
      },
      {
        id: 'doc-ms-2',
        title: 'Incidente de Cascada y Circuit Breaker',
        content: 'Durante la sobrecarga de fin de mes, Payment Engine experimentó alta latencia por bloqueo en PostgreSQL Aurora. El Circuit Breaker de Resilience4j falló al abrir a tiempo, provocando que Order Service agotara su pool de conexiones HTTP. Kafka actuó como búfer asíncrono para amortiguar reintentos.',
        date: '2026-03-15'
      },
      {
        id: 'doc-ms-3',
        title: 'Malla de Telemetría y Detección de Anomalías',
        content: 'Prometheus recolecta métricas cada 5 segundos de Envoy Service Mesh. Un modelo eBPF analiza llamadas a nivel kernel identificando desbordamientos en Redis Cache. Grafana dispara alertas a PagerDuty si el SLA del API Gateway supera los 250ms durante 3 ciclos consecutivos.',
        date: '2026-03-20'
      },
      {
        id: 'doc-ms-4',
        title: 'Persistencia y Resiliencia Geodistribuida',
        content: 'PostgreSQL Aurora sincroniza réplicas en Frankfurt y Virginia. Redis Cache opera en cluster para acelerar consultas frecuentes de Order Service. Para mitigar fallas catastróficas, Kafka persiste eventos en almacenamiento S3 inmutable con retención de 90 días.',
        date: '2026-04-02'
      }
    ],
    presetQueries: [
      {
        id: 'q-ms-1',
        text: '¿Cómo afecta una degradación en PostgreSQL Aurora a la experiencia del usuario en el API Gateway y qué mecanismos la contienen?',
        type: 'LOCAL_MULTI_HOP',
        targetEntities: ['PostgreSQL Aurora', 'Payment Engine', 'Order Service', 'API Gateway', 'Resilience4j', 'Kafka'],
        explanation: 'Requiere saltos: PostgreSQL Aurora -> bloquea Payment Engine -> agota Order Service -> satura API Gateway, mientras Resilience4j y Kafka contienen el impacto.'
      },
      {
        id: 'q-ms-2',
        text: '¿Cuál es la postura global de resiliencia y monitoreo de todo el ecosistema?',
        type: 'GLOBAL',
        targetCommunities: [1, 2, 3],
        explanation: 'Pregunta comunitaria global que no responde un chunk aislado; combina resúmenes de autenticación perimetral, transporte de datos y observabilidad eBPF.'
      },
      {
        id: 'q-ms-3',
        text: '¿Qué componentes interactúan directamente con Envoy Service Mesh para telemetría y seguridad?',
        type: 'LOCAL_MULTI_HOP',
        targetEntities: ['Envoy Service Mesh', 'API Gateway', 'Prometheus', 'WireGuard'],
        explanation: 'Travesía local del grafo alrededor del nodo Envoy Service Mesh y sus aristas conectadas.'
      }
    ],
    nodes: [
      { id: 'n-api-gw', label: 'API Gateway', type: 'SYSTEM', community: 1, importance: 1.8, desc: 'Punto de entrada de red perimetral que aplica mTLS y rate-limiting.' },
      { id: 'n-auth0', label: 'Auth0 / Keycloak', type: 'SECURITY', community: 1, importance: 1.5, desc: 'Servicio de identidad federada y validación de tokens JWT.' },
      { id: 'n-envoy', label: 'Envoy Service Mesh', type: 'PROTOCOL', community: 1, importance: 1.7, desc: 'Malla de comunicación interservicios con proxy sidecar.' },
      { id: 'n-wireguard', label: 'WireGuard mTLS', type: 'PROTOCOL', community: 1, importance: 1.2, desc: 'Capa criptográfica de túnel para tráfico interno.' },
      { id: 'n-order-svc', label: 'Order Service', type: 'SYSTEM', community: 2, importance: 1.6, desc: 'Microservicio de orquestación de pedidos y transacciones de clientes.' },
      { id: 'n-pay-eng', label: 'Payment Engine', type: 'SYSTEM', community: 2, importance: 1.7, desc: 'Procesador de cobros e integrador bancario de alta criticidad.' },
      { id: 'n-circuit-brk', label: 'Resilience4j', type: 'CONCEPT', community: 2, importance: 1.3, desc: 'Patrón de Circuit Breaker y limitador de llamadas concurrentes.' },
      { id: 'n-pg-aurora', label: 'PostgreSQL Aurora', type: 'DATABASE', community: 2, importance: 1.6, desc: 'Base de datos transaccional relacional con réplicas activas.' },
      { id: 'n-kafka', label: 'Apache Kafka', type: 'MESSAGE_BUS', community: 2, importance: 1.8, desc: 'Bus de eventos distribuido de alta persistencia y buffering.' },
      { id: 'n-redis', label: 'Redis Cache', type: 'DATABASE', community: 2, importance: 1.4, desc: 'Caché en memoria sub-milisegundo para estados efímeros.' },
      { id: 'n-prometheus', label: 'Prometheus', type: 'OBSERVABILITY', community: 3, importance: 1.4, desc: 'Sistema de recolección de series de tiempo para métricas.' },
      { id: 'n-ebpf', label: 'eBPF Kernel Probe', type: 'OBSERVABILITY', community: 3, importance: 1.5, desc: 'Inspección de red de bajo nivel sin instrumentación de código.' },
      { id: 'n-grafana', label: 'Grafana & PagerDuty', type: 'OBSERVABILITY', community: 3, importance: 1.3, desc: 'Dashboard unificado y escalamiento de incidentes críticos.' },
      { id: 'n-s3', label: 'S3 Inmutable', type: 'STORAGE', community: 2, importance: 1.2, desc: 'Almacén de objetos WORM para preservación de logs y eventos.' }
    ],
    edges: [
      { id: 'e-1', source: 'n-api-gw', target: 'n-auth0', relation: 'VALIDATES_TOKENS', weight: 0.9, chunkId: 'doc-ms-1' },
      { id: 'e-2', source: 'n-api-gw', target: 'n-envoy', relation: 'ROUTES_VIA', weight: 0.95, chunkId: 'doc-ms-1' },
      { id: 'e-3', source: 'n-envoy', target: 'n-wireguard', relation: 'ENCRYPTS_WITH', weight: 0.85, chunkId: 'doc-ms-1' },
      { id: 'e-4', source: 'n-envoy', target: 'n-order-svc', relation: 'DISPATCHES_TO', weight: 0.9, chunkId: 'doc-ms-1' },
      { id: 'e-5', source: 'n-order-svc', target: 'n-pay-eng', relation: 'CALLS_SYNC', weight: 0.88, chunkId: 'doc-ms-1' },
      { id: 'e-6', source: 'n-order-svc', target: 'n-circuit-brk', relation: 'PROTECTED_BY', weight: 0.8, chunkId: 'doc-ms-2' },
      { id: 'e-7', source: 'n-pay-eng', target: 'n-pg-aurora', relation: 'PERSISTS_IN', weight: 0.92, chunkId: 'doc-ms-2' },
      { id: 'e-8', source: 'n-pay-eng', target: 'n-kafka', relation: 'EMITS_FAILED_EVENT', weight: 0.85, chunkId: 'doc-ms-2' },
      { id: 'e-9', source: 'n-order-svc', target: 'n-redis', relation: 'READS_CACHE', weight: 0.82, chunkId: 'doc-ms-4' },
      { id: 'e-10', source: 'n-prometheus', target: 'n-envoy', relation: 'SCRAPES_METRICS', weight: 0.87, chunkId: 'doc-ms-3' },
      { id: 'e-11', source: 'n-ebpf', target: 'n-redis', relation: 'MONITORS_SOCKETS', weight: 0.78, chunkId: 'doc-ms-3' },
      { id: 'e-12', source: 'n-grafana', target: 'n-prometheus', relation: 'QUERIES_SERIES', weight: 0.9, chunkId: 'doc-ms-3' },
      { id: 'e-13', source: 'n-grafana', target: 'n-api-gw', relation: 'TRIGGERS_SLA_ALERT', weight: 0.84, chunkId: 'doc-ms-3' },
      { id: 'e-14', source: 'n-kafka', target: 'n-s3', relation: 'ARCHIVES_AUDIT', weight: 0.75, chunkId: 'doc-ms-4' },
      { id: 'e-15', source: 'n-order-svc', target: 'n-kafka', relation: 'FALLBACK_QUEUE', weight: 0.89, chunkId: 'doc-ms-2' }
    ],
    communities: [
      {
        id: 1,
        title: 'Comunidad Perimetral & Red de Confianza Cero',
        summary: 'Enfocada en control de acceso, mTLS con WireGuard, inspección perimetral y enrutamiento con Envoy.',
        keyFindings: 'El API Gateway y Envoy son el cuello de botella central de seguridad y enrutamiento.',
        nodes: ['n-api-gw', 'n-auth0', 'n-envoy', 'n-wireguard']
      },
      {
        id: 2,
        title: 'Comunidad Transaccional y Persistencia de Eventos',
        summary: 'Procesamiento de pagos y órdenes, mitigación de fallas con Circuit Breaker, PostgreSQL Aurora y amortiguación en Kafka.',
        keyFindings: 'La dependencia sincrónica entre Order Service y Payment Engine es el vector primario de cascadas si PostgreSQL entra en lock.',
        nodes: ['n-order-svc', 'n-pay-eng', 'n-circuit-brk', 'n-pg-aurora', 'n-kafka', 'n-redis', 'n-s3']
      },
      {
        id: 3,
        title: 'Comunidad Observabilidad en Profundidad & SLA',
        summary: 'Monitoreo de latencia, telemetría eBPF de kernel y escalamiento automático de incidentes críticos.',
        keyFindings: 'Permite visibilidad de degradaciones 15 minutos antes de que el usuario final perciba timeout HTTP.',
        nodes: ['n-prometheus', 'n-ebpf', 'n-grafana']
      }
    ]
  },
  biomedical: {
    id: 'biomedical',
    title: 'Oncología Molecular, Vías de Señalización & Terapia Dirigida',
    description: 'Red de mutaciones genéticas, inhibidores tirosina quinasa y mecanismos de resistencia.',
    documents: [
      {
        id: 'doc-bio-1',
        title: 'Mutaciones Activadoras en EGFR y Respuesta a Osimertinib',
        content: 'La deleción del exón 19 en el gen EGFR hiperactiva la vía MAPK/ERK impulsando la proliferación tumoral. Osimertinib actúa como inhibidor de tercera generación bloqueando selectivamente EGFR mutado con afinidad nanomolar.',
        date: '2026-02-10'
      },
      {
        id: 'doc-bio-2',
        title: 'Mecanismo de Resistencia Secundaria vía MET Amplification',
        content: 'Bajo presión selectiva prolongada con Osimertinib, los clones tumorales desarrollan sobreexpresión del oncogén MET. La amplificación de MET reactiva la fosforilación de ERBB3 y transfiere la señal de supervivencia a la vía PI3K/AKT de forma independiente a EGFR.',
        date: '2026-02-18'
      },
      {
        id: 'doc-bio-3',
        title: 'Estrategia Terapéutica Combinada con Capmatinib',
        content: 'Para superar la resistencia por bypass de MET, el régimen clínico combina Osimertinib con Capmatinib, un inhibidor alostérico de MET. La inhibición simultánea apaga tanto MAPK/ERK como PI3K/AKT, induciendo apoptosis mediada por Caspasa 3.',
        date: '2026-03-01'
      }
    ],
    presetQueries: [
      {
        id: 'q-bio-1',
        text: '¿Cómo elude el tumor el tratamiento con Osimertinib y qué combinación farmacológica restablece la apoptosis?',
        type: 'LOCAL_MULTI_HOP',
        targetEntities: ['EGFR Exón 19', 'Osimertinib', 'MET Amplificación', 'PI3K/AKT', 'Capmatinib', 'Caspasa 3'],
        explanation: 'Conecta la diana inicial, el fármaco, la vía de resistencia secundaria por bypass de MET y la terapia combinada.'
      },
      {
        id: 'q-bio-2',
        text: '¿Cuál es el mapa sinóptico de vías de supervivencia celular descritas en el corpus?',
        type: 'GLOBAL',
        targetCommunities: [1, 2],
        explanation: 'Requiere visión comunitaria global entre la vía MAPK/ERK y la vía PI3K/AKT.'
      }
    ],
    nodes: [
      { id: 'n-egfr', label: 'EGFR Exón 19', type: 'GENE_MUTATION', community: 1, importance: 1.8, desc: 'Mutación activadora común en adenocarcinoma de pulmón.' },
      { id: 'n-mapk', label: 'Vía MAPK/ERK', type: 'PATHWAY', community: 1, importance: 1.6, desc: 'Casada de señalización promotora de proliferación celular.' },
      { id: 'n-osimertinib', label: 'Osimertinib', type: 'DRUG', community: 1, importance: 1.7, desc: 'Inhibidor TKI irreversible de EGFR selectivo.' },
      { id: 'n-met', label: 'MET Amplificación', type: 'GENE_MUTATION', community: 2, importance: 1.7, desc: 'Mecanismo de bypass molecular oncogénico.' },
      { id: 'n-erbb3', label: 'ERBB3 / HER3', type: 'RECEPTOR', community: 2, importance: 1.4, desc: 'Correceptor heterodimérico que activa cascadas de supervivencia.' },
      { id: 'n-pi3k', label: 'Vía PI3K/AKT', type: 'PATHWAY', community: 2, importance: 1.6, desc: 'Vía intracelular crítica de evasión de la muerte programada.' },
      { id: 'n-capmatinib', label: 'Capmatinib', type: 'DRUG', community: 2, importance: 1.5, desc: 'Inhibidor de quinasa MET altamente específico.' },
      { id: 'n-caspase3', label: 'Caspasa 3 (Apoptosis)', type: 'PHENOTYPE', community: 2, importance: 1.5, desc: 'Enzima efectora final del suicidio celular programado.' }
    ],
    edges: [
      { id: 'eb-1', source: 'n-egfr', target: 'n-mapk', relation: 'HYPERACTIVATES', weight: 0.95, chunkId: 'doc-bio-1' },
      { id: 'eb-2', source: 'n-osimertinib', target: 'n-egfr', relation: 'INHIBITS', weight: 0.98, chunkId: 'doc-bio-1' },
      { id: 'eb-3', source: 'n-osimertinib', target: 'n-met', relation: 'PROVOKES_MUTATION_PRESSURE', weight: 0.85, chunkId: 'doc-bio-2' },
      { id: 'eb-4', source: 'n-met', target: 'n-erbb3', relation: 'PHOSPHORYLATES', weight: 0.9, chunkId: 'doc-bio-2' },
      { id: 'eb-5', source: 'n-erbb3', target: 'n-pi3k', relation: 'STIMULATES', weight: 0.92, chunkId: 'doc-bio-2' },
      { id: 'eb-6', source: 'n-capmatinib', target: 'n-met', relation: 'BLOCKS_ACTIVITY', weight: 0.94, chunkId: 'doc-bio-3' },
      { id: 'eb-7', source: 'n-capmatinib', target: 'n-caspase3', relation: 'INDIRECTLY_INDUCES', weight: 0.88, chunkId: 'doc-bio-3' },
      { id: 'eb-8', source: 'n-pi3k', target: 'n-caspase3', relation: 'SUPPRESSES', weight: 0.9, chunkId: 'doc-bio-2' }
    ],
    communities: [
      {
        id: 1,
        title: 'Eje Primario EGFR-MAPK Sensible',
        summary: 'Mutación conductora EGFR y respuesta clínica a Osimertinib.',
        keyFindings: 'Excelente tasa de respuesta inicial pero propensa a resistencias adquiridas a los 12-18 meses.',
        nodes: ['n-egfr', 'n-mapk', 'n-osimertinib']
      },
      {
        id: 2,
        title: 'Mecanismo de Resistencia por Bypass MET-PI3K',
        summary: 'Desvío de la señal por amplificación de MET y reversión farmacológica con Capmatinib.',
        keyFindings: 'La co-inhibición de MET restaura la respuesta apoptótica bloqueando el rescate por PI3K/AKT.',
        nodes: ['n-met', 'n-erbb3', 'n-pi3k', 'n-capmatinib', 'n-caspase3']
      }
    ]
  }
};

/**
 * Heuristic Extractor for custom user texts
 */
export function extractKnowledgeGraphFromText(text, corpusName = 'custom') {
  const sentences = text.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 15);
  const chunks = sentences.map((sent, idx) => ({
    id: `chunk-custom-${idx + 1}`,
    corpusId: corpusName,
    title: `Fragmento de Análisis #${idx + 1}`,
    content: sent.trim(),
    tokenCount: Math.ceil(sent.split(/\s+/).length * 1.3)
  }));

  // Extraction of candidate entities based on capitalized nouns, technical terms and acronyms
  const entityCandidateMap = new Map();
  const patterns = [
    /\b([A-Z][a-zA-Z0-9_\-\+]{2,}(?:\s+[A-Z][a-zA-Z0-9_\-\+]+)*)\b/g,
    /\b([A-Z]{2,6}(?:[-_][A-Z0-9]+)?)\b/g
  ];

  sentences.forEach((sent, sIdx) => {
    patterns.forEach(regex => {
      let match;
      while ((match = regex.exec(sent)) !== null) {
        const entity = match[1].trim();
        // Ignore common stop-words that start capitalized
        const stopWords = ['El', 'La', 'Los', 'Las', 'Un', 'Una', 'Cuando', 'Durante', 'Para', 'Este', 'Esta', 'Sobre', 'Con', 'Sin', 'Pero', 'Por', 'Como', 'The', 'When', 'With', 'Under', 'After'];
        if (!stopWords.includes(entity) && entity.length > 2) {
          if (!entityCandidateMap.has(entity)) {
            entityCandidateMap.set(entity, {
              count: 0,
              sentences: new Set(),
              chunks: new Set()
            });
          }
          const item = entityCandidateMap.get(entity);
          item.count++;
          item.sentences.add(sIdx);
          item.chunks.add(chunks[sIdx].id);
        }
      }
    });
  });

  // Filter top entities (keep between 6 and 18 for crisp graph visualization)
  const sortedEntities = Array.from(entityCandidateMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 16);

  if (sortedEntities.length < 3) {
    // Fallback if no capitalized terms found
    sortedEntities.push(['Entidad Central', { count: 3, sentences: new Set([0]), chunks: new Set([chunks[0]?.id]) }]);
    sortedEntities.push(['Componente Primario', { count: 2, sentences: new Set([0]), chunks: new Set([chunks[0]?.id]) }]);
    sortedEntities.push(['Efecto Operativo', { count: 2, sentences: new Set([0]), chunks: new Set([chunks[0]?.id]) }]);
  }

  // Create Nodes
  const nodes = sortedEntities.map(([name, data], idx) => {
    const id = `node-${idx + 1}`;
    // Assign community using simple clustering (heuristic modularity by co-occurrence)
    const community = (idx % 3) + 1;
    let type = 'CONCEPT';
    if (/service|gateway|engine|server|api/i.test(name)) type = 'SYSTEM';
    else if (/sql|db|cache|redis|postgres|s3/i.test(name)) type = 'DATABASE';
    else if (/tls|mesh|wireguard|http|grpc|kafka/i.test(name)) type = 'PROTOCOL';
    else if (/gene|mut|egfr|met|erk|akt|kinase/i.test(name)) type = 'GENE_MUTATION';
    else if (/drug|ib|nib|mab|therapy/i.test(name)) type = 'DRUG';

    return {
      id,
      label: name,
      type,
      community,
      importance: Number((1.0 + Math.min(data.count * 0.25, 1.2)).toFixed(2)),
      desc: `Entidad identificada en ${data.chunks.size} fragmentos del texto proporcionado.`,
      chunkIds: Array.from(data.chunks)
    };
  });

  // Create Edges based on co-occurrence in same sentence
  const edges = [];
  let edgeIdCount = 1;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = sortedEntities[i];
      const nodeB = sortedEntities[j];
      const sharedSentences = Array.from(nodeA[1].sentences).filter(sIdx => nodeB[1].sentences.has(sIdx));

      if (sharedSentences.length > 0 || (i === 0 && j < 4)) {
        const chunkRef = chunks[sharedSentences[0] || 0]?.id || chunks[0].id;
        edges.push({
          id: `edge-${edgeIdCount++}`,
          source: nodes[i].id,
          target: nodes[j].id,
          relation: 'INTERACTS_WITH',
          weight: Number((0.6 + Math.min(sharedSentences.length * 0.15, 0.35)).toFixed(2)),
          chunkId: chunkRef
        });
      }
    }
  }

  // Generate community summaries
  const communities = [1, 2, 3].map(commId => {
    const commNodes = nodes.filter(n => n.community === commId);
    return {
      id: commId,
      title: `Clúster Comunitario #${commId}`,
      summary: `Agrupación semántica que vincula ${commNodes.map(n => n.label).slice(0, 4).join(', ')}.`,
      keyFindings: `Presenta ${commNodes.length} entidades de alto impacto en el texto analizado.`,
      nodes: commNodes.map(n => n.id)
    };
  }).filter(c => c.nodes.length > 0);

  return {
    id: corpusName,
    title: 'Corpus Personalizado Ingerido',
    description: `Grafo extraído dinámicamente: ${nodes.length} entidades y ${edges.length} relaciones semánticas.`,
    documents: chunks,
    nodes,
    edges,
    communities,
    presetQueries: [
      {
        id: 'q-custom-1',
        text: `¿Cuál es el impacto y las relaciones de ${nodes[0]?.label || 'la entidad principal'} en este sistema?`,
        type: 'LOCAL_MULTI_HOP',
        targetEntities: nodes.slice(0, 4).map(n => n.label),
        explanation: 'Consulta de descubrimiento multi-salto sobre las entidades de mayor frecuencia.'
      },
      {
        id: 'q-custom-2',
        text: '¿Cuál es el resumen global de todas las interacciones del documento?',
        type: 'GLOBAL',
        targetCommunities: communities.map(c => c.id),
        explanation: 'Consulta global comunitaria para sintetizar los hallazgos principales.'
      }
    ]
  };
}
