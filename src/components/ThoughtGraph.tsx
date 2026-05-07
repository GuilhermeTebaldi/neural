
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GitGraph, RefreshCcw } from 'lucide-react';
import { MentalArchitecture, ThoughtNode, GraphViewMode } from '../types';

interface ThoughtGraphProps {
  data: MentalArchitecture;
  onNodeClick: (node: ThoughtNode) => void;
  selectedId?: string;
  activeLineageId: string | null;
  viewMode: GraphViewMode;
}

export default function ThoughtGraph({ data, onNodeClick, selectedId, activeLineageId, viewMode }: ThoughtGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const simulationRef = useRef<any>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);

  const handleOrganize = () => {
    if (!simulationRef.current) return;
    setIsOrganizing(true);
    
    const sim = simulationRef.current;
    
    // Boost forces to push nodes apart
    sim.force('charge').strength(viewMode === 'neural' ? -1000 : -500);
    sim.force('collision').radius(100);
    
    // Reheat simulation
    sim.alpha(1).restart();
    
    // After a short period, restore normal forces
    setTimeout(() => {
      sim.force('charge').strength(viewMode === 'neural' ? -400 : -100);
      sim.force('collision').radius(60);
      setIsOrganizing(false);
    }, 2000);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || dimensions.width === 0) return;

    const { width, height } = dimensions;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Initial data for simulation
    const nodes = data.nodes.map(n => ({ ...n }));
    const links = data.links.map(l => ({ ...l }));

    // Pre-calculate some values for different layouts
    const nodesMap = new Map(nodes.map(n => [n.id, n]));
    
    // Calculate node depth for hierarchical/radial/flow
    const depthMap = new Map<string, number>();
    const computeDepth = (id: string, depth: number, visited: Set<string>) => {
      if (visited.has(id)) return;
      visited.add(id);
      const currentDepth = depthMap.get(id) || 0;
      depthMap.set(id, Math.max(currentDepth, depth));
      
      const children = nodes.filter(n => n.parentId === id);
      children.forEach(c => computeDepth(c.id, depth + 1, visited));
      
      const internalLinks = data.links.filter(l => l.source === id);
      internalLinks.forEach(l => computeDepth(l.target, depth + 1, visited));
    };

    const roots = data.nodes.filter(n => !n.parentId);
    roots.forEach(root => computeDepth(root.id, 0, new Set()));

    const maxDepth = Math.max(0, ...Array.from(depthMap.values()));
    const nodesByDepth: Record<number, string[]> = {};
    Array.from(depthMap.entries()).forEach(([id, depth]) => {
      if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
      nodesByDepth[depth].push(id);
    });

    // Create the simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80).strength(viewMode === 'neural' ? 1 : 0.4))
      .force('charge', d3.forceManyBody().strength(viewMode === 'neural' ? -400 : -100))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(viewMode === 'neural' ? 1 : 0.1))
      .force('collision', d3.forceCollide().radius(60));

    // Custom forces based on mode
    if (viewMode === 'radial') {
      simulation.force('radial', d3.forceRadial(
        (d: any) => (depthMap.get(d.id) || 0) * 150 + 50,
        width / 2,
        height / 2
      ).strength(1.2));
    } else if (viewMode === 'hierarchical') {
      simulation.force('y', d3.forceY((d: any) => {
        const depth = depthMap.get(d.id) || 0;
        return (height / (maxDepth + 2)) * (depth + 1);
      }).strength(2));
      simulation.force('x', d3.forceX(width / 2).strength(0.2));
    } else if (viewMode === 'flow') {
      simulation.force('x', d3.forceX((d: any) => {
        const depth = depthMap.get(d.id) || 0;
        return (width / (maxDepth + 2)) * (depth + 1);
      }).strength(2));
      simulation.force('y', d3.forceY(height / 2).strength(0.2));
    } else if (viewMode === 'synapse') {
      simulation.stop();
      
      // Organização em Camadas Inteligentes (Inspirado em Redes Neurais Profundas)
      const layers = Object.keys(nodesByDepth).map(Number).sort((a, b) => a - b);
      const layerWidth = width / (layers.length + 1);
      
      nodes.forEach((d: any) => {
        const depth = depthMap.get(d.id) || 0;
        const layerIndex = layers.indexOf(depth);
        const nodesInLayer = nodesByDepth[depth] || [];
        const indexInLayer = nodesInLayer.indexOf(d.id);
        
        // Posicionamento em "X" baseado na profundidade (camadas)
        d.x = layerWidth * (layerIndex + 1);
        
        // Posicionamento em "Y" centralizado e distribuído com padding
        const verticalPadding = height * 0.15;
        const availableHeight = height - (verticalPadding * 2);
        const stepY = nodesInLayer.length > 1 ? availableHeight / (nodesInLayer.length - 1) : 0;
        
        d.y = nodesInLayer.length > 1 
          ? verticalPadding + (indexInLayer * stepY) 
          : height / 2;
        
        // Bloquear posição para evitar drift
        d.fx = d.x;
        d.fy = d.y;
      });
    }

    simulationRef.current = simulation;

    // Filters and Markers
    const defs = svg.append('defs');
    
    // Filtro de brilho neon para sinapses
    const filter = defs.append('filter')
      .attr('id', 'synaptic-glow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'blur');
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradientes para os links
    const gradient = defs.append('linearGradient')
      .attr('id', 'synapse-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    
    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.2);
    gradient.append('stop').attr('offset', '50%').attr('stop-color', '#818cf8').attr('stop-opacity', 0.8);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.2);

    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#cbd5e1')
      .style('stroke', 'none');

    // Links
    const link = g.append('g')
      .selectAll('path')
      .data(links)
      .enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', viewMode === 'synapse' ? 'url(#synapse-gradient)' : '#3b82f6')
      .attr('stroke-width', (d: any) => viewMode === 'synapse' ? 2 : 0.8)
      .attr('opacity', (d: any) => viewMode === 'synapse' ? 0.6 : 0.3)
      .attr('filter', viewMode === 'synapse' ? 'url(#synaptic-glow)' : 'none')
      .attr('class', viewMode === 'synapse' ? 'synapse-line' : '')
      .attr('marker-end', (d: any) => viewMode === 'synapse' ? 'none' : 'url(#arrowhead)');

    // Strategic backdrop "neural grid" lines
    const gridData = d3.range(30).map(() => ({
      x1: Math.random() * width,
      y1: Math.random() * height,
      x2: Math.random() * width,
      y2: Math.random() * height,
    }));

    g.insert('g', ':first-child')
      .selectAll('line')
      .data(gridData)
      .enter().append('line')
      .attr('x1', d => d.x1)
      .attr('y1', d => d.y1)
      .attr('x2', d => d.x2)
      .attr('y2', d => d.y2)
      .attr('stroke', viewMode === 'synapse' ? '#6366f1' : '#3b82f6')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.08)
      .attr('stroke-dasharray', '5,5')
      .append('animate')
        .attr('attributeName', 'stroke-dashoffset')
        .attr('from', 0)
        .attr('to', 100)
        .attr('dur', '10s')
        .attr('repeatCount', 'indefinite');

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d: any) => onNodeClick(d))
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    // Node circles with technical AI look
    const colors: Record<string, string> = {
      thought: '#3b82f6',
      emotion: '#db2777',
      discovery: '#10b981',
      project: '#f59e0b',
      milestone: '#8b5cf6',
      fato: '#64748b',
      hipotese: '#8b5cf6',
      projeto: '#f59e0b',
      duvida: '#ec4899',
      ideia: '#eab308',
      sequencia: '#6366f1'
    };

    node.append('circle')
      .attr('r', (d: any) => d.id === selectedId ? 18 : 12)
      .attr('fill', '#fff')
      .attr('stroke', (d: any) => colors[d.type] || '#6366f1')
      .attr('stroke-width', (d: any) => d.id === selectedId ? 5 : 2.5)
      .style('filter', (d: any) => {
        if (viewMode === 'synapse') return `drop-shadow(0 0 15px ${colors[d.type] || '#6366f1'}cc)`;
        return d.id === selectedId ? `drop-shadow(0 0 12px ${colors[d.type] || '#6366f1'}88)` : 'none';
      })
      .attr('opacity', 0.95);

    node.append('circle')
      .attr('r', (d: any) => d.id === selectedId ? 7 : 5)
      .attr('fill', (d: any) => colors[d.type] || '#6366f1');

    // Labels with glassmorphism feel
    const labels = node.append('g')
      .attr('transform', 'translate(18, 5)');
    
    labels.append('text')
      .text((d: any) => d.title)
      .attr('fill', '#0f172a')
      .attr('font-size', (d: any) => d.id === selectedId ? '14px' : '11px')
      .attr('font-weight', (d: any) => d.id === selectedId ? '800' : '600')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 8px rgba(255,255,255,0.9)');

    const updatePositions = () => {
      link.attr('d', (d: any) => {
        const x1 = d.source.x;
        const y1 = d.source.y;
        const x2 = d.target.x;
        const y2 = d.target.y;

        if (viewMode === 'synapse') {
          // Curva de Bezier para Malha Neural Estéril com variação para evitar sobreposição total
          const dx = x2 - x1;
          const midX = x1 + dx * 0.5;
          
          // Usamos o ID dos nós ou índice para dar uma curvatura única a cada "cabo"
          const sourceIdx = nodes.findIndex((n: any) => n.id === d.source.id);
          const targetIdx = nodes.findIndex((n: any) => n.id === d.target.id);
          const offset = ((sourceIdx + targetIdx) % 11 - 5) * 15;
          
          return `M${x1},${y1} C${midX},${y1 + offset} ${midX},${y2 - offset} ${x2},${y2}`;
        }
        
        if (viewMode === 'radial') {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const nx = -dy * 0.1;
          const ny = dx * 0.1;
          return `M${x1},${y1} Q${midX + nx},${midY + ny} ${x2},${y2}`;
        }
        
        return `M${x1},${y1} L${x2},${y2}`;
      });

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    };

    // Aplicar posições iniciais se a simulação estiver parada
    if (viewMode === 'synapse') {
      updatePositions();
    }

    simulation.on('tick', updatePositions);

    function dragstarted(event: any) {
      if (viewMode === 'synapse') return; // Bloquear arrasto na Malha Sináptica
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      if (viewMode === 'synapse') return;
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Auto-center on selected node
    if (selectedId) {
      const focusOnNode = () => {
        const target = nodes.find(n => n.id === selectedId) as any;
        if (target && target.x) {
          const x = target.x;
          const y = target.y;
          const scale = 1.5;
          
          svg.transition()
            .duration(1200)
            .ease(d3.easePolyInOut.exponent(3))
            .call(
              zoom.transform as any, 
              d3.zoomIdentity
                .translate(width / 2 - x * scale, height / 2 - y * scale)
                .scale(scale)
            );
        }
      };

      const timeout = setTimeout(focusOnNode, 100);
      return () => clearTimeout(timeout);
    }

    return () => simulation.stop();
  }, [data, onNodeClick, selectedId, dimensions, viewMode]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 relative overflow-hidden">
      {/* HUD Info */}
      <div className="absolute top-6 left-6 z-10 space-y-3 pointer-events-none">
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-black tracking-[0.2em] text-indigo-400 opacity-60">Neural Matrix Interface v2.5</div>
          <div className="text-xs text-indigo-600 font-bold flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)] ${isOrganizing ? 'bg-amber-500 animate-ping' : 'bg-indigo-500 animate-pulse'}`} />
            {isOrganizing ? 'Otimizando Topologia...' : 'Protocolo RAFAEL: Ativo'}
          </div>
        </div>

        <div className="pointer-events-auto">
          <button
            onClick={handleOrganize}
            disabled={isOrganizing}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isOrganizing ? 'bg-amber-100 text-amber-600 border border-amber-200 cursor-not-allowed' : 'bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-sm'}`}
          >
            <RefreshCcw className={`w-3 h-3 ${isOrganizing ? 'animate-spin' : ''}`} />
            Recalibrar Matriz
          </button>
        </div>
      </div>

      <svg ref={svgRef} className="w-full h-full" />
      
      {/* Visual Enhancements Cover */}
      <div className="absolute inset-0 pointer-events-none border-[24px] border-slate-50/50 mix-blend-overlay opacity-20" />
      <div className="absolute bottom-6 right-6 z-10 opacity-30">
        <GitGraph className="w-24 h-24 text-indigo-200" />
      </div>
    </div>
  );
}
