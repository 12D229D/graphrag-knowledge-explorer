/**
 * force-canvas.js
 * Visualizador interactivo 2D de grafos de conocimiento basado en simulación física
 * Soporta arrastre de nodos, zoom/pan, comunidades de color HSL y animación de rutas Multi-Hop
 */

export class ForceGraphCanvas {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.options = Object.assign({
      nodeBaseRadius: 9,
      repulsion: 4200,
      springLength: 110,
      springStrength: 0.05,
      damping: 0.88,
      centerPull: 0.015,
      onNodeClick: null,
      onNodeHover: null
    }, options);

    this.nodes = [];
    this.edges = [];
    this.communities = [];
    this.activePathNodes = new Set();
    this.activePathEdges = new Set();
    this.highlightCommunity = null;

    // Viewport transform
    this.transform = {
      x: 0,
      y: 0,
      scale: 1.0
    };

    // Interaction state
    this.isDraggingCanvas = false;
    this.draggedNode = null;
    this.dragStart = { x: 0, y: 0 };
    this.hoveredNode = null;
    this.animating = false;
    this.pulsePhase = 0;

    // Colors mapping (HSL design tokens)
    this.communityColors = {
      1: { fill: 'hsl(265, 85%, 65%)', stroke: 'hsl(265, 95%, 80%)', glow: 'hsla(265, 85%, 65%, 0.45)' }, // Violeta
      2: { fill: 'hsl(190, 95%, 50%)', stroke: 'hsl(190, 100%, 75%)', glow: 'hsla(190, 95%, 50%, 0.45)' }, // Cian
      3: { fill: 'hsl(155, 80%, 48%)', stroke: 'hsl(155, 90%, 75%)', glow: 'hsla(155, 80%, 48%, 0.45)' }, // Esmeralda
      4: { fill: 'hsl(35, 95%, 55%)', stroke: 'hsl(35, 100%, 75%)', glow: 'hsla(35, 95%, 55%, 0.45)' },  // Ámbar
      default: { fill: 'hsl(220, 20%, 55%)', stroke: 'hsl(220, 20%, 80%)', glow: 'hsla(220, 20%, 55%, 0.3)' }
    };

    this.initEvents();
    this.resizeCanvas();
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height || 540;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  setData(graphData) {
    const { nodes, edges, communities } = graphData;
    this.communities = communities || [];

    // Initialize node positions around center if not already set
    const cx = this.width / 2;
    const cy = this.height / 2;
    const total = nodes.length;

    this.nodes = nodes.map((node, i) => {
      const angle = (i / Math.max(total, 1)) * 2 * Math.PI;
      const radius = 100 + (i % 3) * 60;
      return {
        ...node,
        x: node.x !== undefined ? node.x : cx + Math.cos(angle) * radius,
        y: node.y !== undefined ? node.y : cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: this.options.nodeBaseRadius * (node.importance || 1.0)
      };
    });

    // Map node references in edges
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    this.edges = edges.map(edge => ({
      ...edge,
      sourceNode: nodeMap.get(typeof edge.source === 'string' ? edge.source : edge.source.id),
      targetNode: nodeMap.get(typeof edge.target === 'string' ? edge.target : edge.target.id)
    })).filter(e => e.sourceNode && e.targetNode);

    this.clearPathHighlight();
    this.resetView();
    this.startSimulation();
  }

  resetView() {
    this.transform = {
      x: 0,
      y: 0,
      scale: 1.0
    };
  }

  highlightPath(nodeIds = [], edgeIds = []) {
    this.activePathNodes = new Set(nodeIds);
    this.activePathEdges = new Set(edgeIds);
    this.render();
  }

  clearPathHighlight() {
    this.activePathNodes.clear();
    this.activePathEdges.clear();
    this.highlightCommunity = null;
    this.render();
  }

  filterCommunity(communityId) {
    this.highlightCommunity = communityId;
    this.render();
  }

  startSimulation() {
    this.animating = true;
    let iterations = 0;
    const maxIterations = 350;

    const step = () => {
      if (!this.animating) return;
      this.pulsePhase = (this.pulsePhase + 0.05) % (Math.PI * 2);

      let totalMovement = 0;
      if (iterations < maxIterations) {
        totalMovement = this.updatePhysics();
        iterations++;
      }

      this.render();

      // Continue animating if pulsing paths or moving
      if (iterations < maxIterations || this.activePathNodes.size > 0 || this.draggedNode) {
        requestAnimationFrame(step);
      } else {
        this.animating = false;
        this.render();
      }
    };

    requestAnimationFrame(step);
  }

  updatePhysics() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const { repulsion, springLength, springStrength, damping, centerPull } = this.options;
    let maxMovement = 0;

    // 1. Repulsion between all node pairs (Coulomb force)
    for (let i = 0; i < this.nodes.length; i++) {
      const n1 = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n2 = this.nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 100;
        const dist = Math.sqrt(distSq);

        const force = repulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        n1.vx -= fx;
        n1.vy -= fy;
        n2.vx += fx;
        n2.vy += fy;
      }

      // Center gravity
      n1.vx += (cx - n1.x) * centerPull;
      n1.vy += (cy - n1.y) * centerPull;
    }

    // 2. Spring attraction along edges (Hooke's law)
    for (const edge of this.edges) {
      const { sourceNode, targetNode, weight = 1 } = edge;
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - springLength;

      const force = displacement * springStrength * weight;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      sourceNode.vx += fx;
      sourceNode.vy += fy;
      targetNode.vx -= fx;
      targetNode.vy -= fy;
    }

    // 3. Update positions with damping
    for (const node of this.nodes) {
      if (node === this.draggedNode) continue;
      node.vx *= damping;
      node.vy *= damping;

      node.x += node.vx;
      node.y += node.vy;

      const move = Math.abs(node.vx) + Math.abs(node.vy);
      if (move > maxMovement) maxMovement = move;
    }

    return maxMovement;
  }

  render() {
    const { ctx, width, height, transform } = this;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // Apply zoom & pan
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // Draw community hulls / halos
    this.drawCommunityHulls();

    // Draw Edges
    this.drawEdges();

    // Draw Nodes
    this.drawNodes();

    ctx.restore();
  }

  drawCommunityHulls() {
    const { ctx } = this;
    const communityGroups = new Map();

    for (const node of this.nodes) {
      if (!communityGroups.has(node.community)) {
        communityGroups.set(node.community, []);
      }
      communityGroups.get(node.community).push(node);
    }

    communityGroups.forEach((nodes, commId) => {
      if (nodes.length < 2) return;
      const col = this.communityColors[commId] || this.communityColors.default;

      // Calculate centroid and radius
      let sumX = 0, sumY = 0;
      for (const n of nodes) {
        sumX += n.x;
        sumY += n.y;
      }
      const cx = sumX / nodes.length;
      const cy = sumY / nodes.length;

      let maxR = 0;
      for (const n of nodes) {
        const d = Math.hypot(n.x - cx, n.y - cy);
        if (d > maxR) maxR = d;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, maxR + 32, 0, Math.PI * 2);
      ctx.fillStyle = col.glow.replace(/[\d\.]+\)$/, '0.045)');
      ctx.strokeStyle = col.glow.replace(/[\d\.]+\)$/, '0.22)');
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Community badge label
      ctx.fillStyle = col.stroke;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`COMUNIDAD #${commId}`, cx, cy - maxR - 38);
      ctx.restore();
    });
  }

  drawEdges() {
    const { ctx } = this;

    for (const edge of this.edges) {
      const { sourceNode: s, targetNode: t, relation, id } = edge;
      const isPathEdge = this.activePathEdges.has(id);
      const isDimmed = (this.activePathEdges.size > 0 && !isPathEdge) ||
        (this.highlightCommunity !== null && (s.community !== this.highlightCommunity || t.community !== this.highlightCommunity));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);

      if (isPathEdge) {
        const pulse = (Math.sin(this.pulsePhase) + 1) * 0.5;
        ctx.strokeStyle = `hsl(185, 100%, ${65 + pulse * 20}%)`;
        ctx.lineWidth = 3.5 + pulse * 2;
        ctx.shadowColor = 'hsla(185, 100%, 50%, 0.8)';
        ctx.shadowBlur = 12;
      } else if (isDimmed) {
        ctx.strokeStyle = 'hsla(220, 20%, 30%, 0.2)';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = 'hsla(220, 25%, 55%, 0.45)';
        ctx.lineWidth = 1.5;
      }

      ctx.stroke();

      // Directed Arrowhead
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const angle = Math.atan2(dy, dx);
      const targetRadius = t.radius + 4;
      const arrowX = t.x - Math.cos(angle) * targetRadius;
      const arrowY = t.y - Math.sin(angle) * targetRadius;

      ctx.beginPath();
      ctx.fillStyle = isPathEdge ? 'hsl(185, 100%, 75%)' : (isDimmed ? 'hsla(220, 20%, 40%, 0.3)' : 'hsla(220, 30%, 70%, 0.7)');
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 8 * Math.cos(angle - Math.PI / 6), arrowY - 8 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(arrowX - 8 * Math.cos(angle + Math.PI / 6), arrowY - 8 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      // Relation Label along edge (if highlighted or hovered)
      if (isPathEdge || this.hoveredNode === s || this.hoveredNode === t) {
        const midX = (s.x + t.x) / 2;
        const midY = (s.y + t.y) / 2;
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = isPathEdge ? 'hsl(185, 100%, 90%)' : 'hsl(220, 25%, 85%)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(relation, midX, midY - 6);
      }

      ctx.restore();
    }
  }

  drawNodes() {
    const { ctx } = this;

    for (const node of this.nodes) {
      const isPathNode = this.activePathNodes.has(node.id) || this.activePathNodes.has(node.label);
      const isHovered = this.hoveredNode === node;
      const isDimmed = (this.activePathNodes.size > 0 && !isPathNode) ||
        (this.highlightCommunity !== null && node.community !== this.highlightCommunity);

      const col = this.communityColors[node.community] || this.communityColors.default;

      ctx.save();

      // Halo / Glow
      if (isPathNode || isHovered) {
        const pulse = (Math.sin(this.pulsePhase) + 1) * 0.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (isPathNode ? 10 + pulse * 6 : 8), 0, Math.PI * 2);
        ctx.fillStyle = isPathNode ? `hsla(185, 100%, 55%, ${0.35 + pulse * 0.25})` : col.glow;
        ctx.fill();
      }

      // Main Node Body
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      if (isDimmed) {
        ctx.fillStyle = 'hsla(220, 20%, 25%, 0.4)';
        ctx.strokeStyle = 'hsla(220, 20%, 40%, 0.4)';
      } else if (isPathNode) {
        ctx.fillStyle = 'hsl(185, 95%, 55%)';
        ctx.strokeStyle = '#ffffff';
      } else {
        ctx.fillStyle = col.fill;
        ctx.strokeStyle = col.stroke;
      }

      ctx.lineWidth = isPathNode ? 3 : 2;
      ctx.fill();
      ctx.stroke();

      // Inner icon or indicator
      ctx.beginPath();
      ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Node Label
      ctx.font = `${isPathNode || isHovered ? '600 12px' : '500 11px'} 'Inter', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      if (isPathNode) {
        ctx.fillStyle = 'hsl(185, 100%, 95%)';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
      } else if (isDimmed) {
        ctx.fillStyle = 'hsla(220, 20%, 50%, 0.5)';
      } else {
        ctx.fillStyle = 'hsl(220, 25%, 92%)';
      }

      ctx.fillText(node.label, node.x, node.y + node.radius + 6);

      // Sub-label for entity type
      if (isHovered || isPathNode) {
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'hsl(265, 80%, 80%)';
        ctx.fillText(`[${node.type}]`, node.x, node.y + node.radius + 20);
      }

      ctx.restore();
    }
  }

  initEvents() {
    let lastX = 0;
    let lastY = 0;

    const getCanvasPos = (evt) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = evt.clientX - rect.left;
      const mouseY = evt.clientY - rect.top;
      // Convert to graph coordinate space considering transform
      return {
        graphX: (mouseX - this.transform.x) / this.transform.scale,
        graphY: (mouseY - this.transform.y) / this.transform.scale,
        rawX: mouseX,
        rawY: mouseY
      };
    };

    const findNodeAt = (gx, gy) => {
      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const n = this.nodes[i];
        const dist = Math.hypot(n.x - gx, n.y - gy);
        if (dist <= n.radius + 4) return n;
      }
      return null;
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getCanvasPos(e);
      lastX = e.clientX;
      lastY = e.clientY;

      const hit = findNodeAt(pos.graphX, pos.graphY);
      if (hit) {
        this.draggedNode = hit;
        hit.vx = 0;
        hit.vy = 0;
        if (!this.animating) this.startSimulation();
      } else {
        this.isDraggingCanvas = true;
      }
    });

    window.addEventListener('mousemove', (e) => {
      const pos = getCanvasPos(e);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      if (this.draggedNode) {
        this.draggedNode.x = pos.graphX;
        this.draggedNode.y = pos.graphY;
        this.draggedNode.vx = 0;
        this.draggedNode.vy = 0;
        this.render();
      } else if (this.isDraggingCanvas) {
        this.transform.x += dx;
        this.transform.y += dy;
        this.render();
      } else {
        // Hover detection
        const prevHover = this.hoveredNode;
        this.hoveredNode = findNodeAt(pos.graphX, pos.graphY);
        this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'grab';
        if (this.hoveredNode !== prevHover) {
          if (this.options.onNodeHover) this.options.onNodeHover(this.hoveredNode);
          this.render();
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.draggedNode && this.options.onNodeClick) {
        this.options.onNodeClick(this.draggedNode);
      }
      this.draggedNode = null;
      this.isDraggingCanvas = false;
      this.canvas.style.cursor = 'grab';
    });

    // Zoom via wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.min(Math.max(this.transform.scale * zoomFactor, 0.35), 3.5);

      // Zoom towards cursor
      this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
      this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
      this.transform.scale = newScale;

      this.render();
    }, { passive: false });

    window.addEventListener('resize', () => this.resizeCanvas());
  }
}
