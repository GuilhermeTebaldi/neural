/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { GraphViewMode, MentalArchitecture, ThoughtNode, ThoughtType } from './types';
import { getMentalData, deleteThought, updateThought, addThought } from './lib/thoughts-store';
import { generateEmbedding } from './services/aiService';
import ThoughtGraph from './components/ThoughtGraph';
import ThoughtControls from './components/ThoughtControls';
import ThoughtDetail from './components/ThoughtDetail';

export default function App() {
  const [data, setData] = useState<MentalArchitecture>(getMentalData());
  const [selectedNode, setSelectedNode] = useState<ThoughtNode | null>(null);
  const [activeLineageId, setActiveLineageId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<GraphViewMode>('flow');

  // Auto-select latest work on startup
  React.useEffect(() => {
    if (!hasInitialized && data.nodes.length > 0) {
      const latest = [...data.nodes].sort((a, b) => b.createdAt - a.createdAt)[0];
      if (latest) {
        if (!latest.parentId) {
          setActiveLineageId(latest.id);
        } else {
          // Find root
          let current = latest;
          while (current.parentId) {
            const parent = data.nodes.find(n => n.id === current.parentId);
            if (!parent) break;
            current = parent;
          }
          setActiveLineageId(current.id);
        }
        setSelectedNode(latest);
      }
      setHasInitialized(true);
    }
  }, [data.nodes, hasInitialized]);

  const refreshData = useCallback(() => {
    setData(getMentalData());
  }, []);

  const handleDelete = useCallback((id: string) => {
    console.log('App: handleDelete triggered for', id);
    deleteThought(id);
    console.log('App: Thought deleted from store, refreshing data...');
    refreshData();
    setSelectedNode(null);
    if (activeLineageId === id) setActiveLineageId(null);
  }, [activeLineageId, refreshData]);

  const handleUpdate = useCallback((id: string, updates: any) => {
    updateThought(id, updates);
    refreshData();
    // Update local selected node if it's the one being edited
    setSelectedNode(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  }, [refreshData]);

  const handleThoughtAdded = useCallback((newNode: ThoughtNode) => {
    refreshData();
    setSelectedNode(newNode);
    setIsAdding(false);
    // Auto-focus if it's a new root
    if (!newNode.parentId) setActiveLineageId(newNode.id);
  }, [refreshData]);

  const handleNodeSelect = useCallback((node: ThoughtNode, skipJump = false) => {
    setIsAdding(false); // Close add form when a node is selected to prioritize details
    if (!node.parentId) {
      // Só salta para o último nó se estiver manualmente selecionando uma NOVA linhagem da lista lateral
      // ou se for a primeira carga do sistema.
      if (activeLineageId !== node.id && !skipJump) {
        setActiveLineageId(node.id);
        
        const findDescendants = (id: string, nodes: ThoughtNode[], visited: Set<string> = new Set()) => {
          if (visited.has(id)) return visited;
          visited.add(id);
          nodes.filter(n => n.parentId === id).forEach(child => findDescendants(child.id, nodes, visited));
          return visited;
        };
        
        const lineageIds = findDescendants(node.id, data.nodes);
        const latestNode = data.nodes
          .filter(n => lineageIds.has(n.id))
          .sort((a, b) => b.createdAt - a.createdAt)[0];
        
        setSelectedNode(latestNode || node);
      } else {
        // Se já está na linhagem ou se pedimos para não pular, apenas seleciona o nó clicado
        if (activeLineageId !== node.id) setActiveLineageId(node.id);
        setSelectedNode(node);
      }
    } else {
      setSelectedNode(node);
    }
    
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [data.nodes, activeLineageId]);

  const handleEvolve = useCallback(async (
    parentId: string,
    payload: {
      title: string;
      content: string;
      type: ThoughtType;
      source?: string;
      period?: string;
      factualConfidence?: number;
      hypothesisConfidence?: number;
      evidenceConfidence?: number;
      tags?: string[];
      hypotheses?: string[];
      evidences?: string[];
    }
  ) => {
    if (!payload.title.trim()) return;

    const cleanUpdates = {
      source: payload.source?.trim() || undefined,
      period: payload.period?.trim() || undefined,
      factualConfidence: payload.factualConfidence,
      hypothesisConfidence: payload.hypothesisConfidence,
      evidenceConfidence: payload.evidenceConfidence,
      hypotheses: payload.hypotheses && payload.hypotheses.length > 0 ? payload.hypotheses : undefined,
      evidences: payload.evidences && payload.evidences.length > 0 ? payload.evidences : undefined
    };

    const hasManualMeta = Object.values(cleanUpdates).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null
    );

    const evolveWithPayload = (embedding?: number[]) => {
      const newNode = addThought(
        payload.title,
        payload.content,
        payload.type,
        parentId,
        [],
        embedding,
        payload.tags || []
      );

      if (hasManualMeta) {
        updateThought(newNode.id, cleanUpdates);
      }

      handleThoughtAdded({
        ...newNode,
        ...cleanUpdates,
        tags: payload.tags || newNode.tags
      });
    };

    try {
      const embedding = await generateEmbedding(`${payload.title} ${payload.content}`);
      evolveWithPayload(embedding);
    } catch {
      evolveWithPayload();
    }
  }, [handleThoughtAdded]);

  const handleLinkClick = useCallback((id: string) => {
    const node = data.nodes.find(n => n.id === id);
    if (node) {
      // Pequena sequência para fechar, animar o mapa e reabrir
      setSelectedNode(null);
      setTimeout(() => {
        setSelectedNode(node);
      }, 500);
    }
  }, [data.nodes]);

  // Filter graph data based on lineage
  const filteredData = React.useMemo(() => {
    if (!activeLineageId) return data;
    
    // Find all nodes in this lineage
    const findDescendants = (id: string, visited: Set<string> = new Set()) => {
      if (visited.has(id)) return;
      visited.add(id);
      data.nodes.filter(n => n.parentId === id).forEach(child => findDescendants(child.id, visited));
      const node = data.nodes.find(n => n.id === id);
      node?.links.forEach(link => findDescendants(link, visited));
      return visited;
    };

    const members = findDescendants(activeLineageId);
    if (!members) return data;

    return {
      nodes: data.nodes.filter(n => members.has(n.id)),
      links: data.links.filter(l => members.has(l.source) && members.has(l.target))
    };
  }, [data, activeLineageId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans relative">
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-3 left-3 z-40 p-2.5 bg-white border border-slate-200 rounded-lg shadow-lg text-slate-600 hover:text-blue-600 transition-colors"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Controls */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-[88vw] max-w-[22rem] md:w-80 transform transition-transform duration-300 ease-in-out bg-white shadow-2xl md:shadow-none md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <ThoughtControls 
          onThoughtAdded={(node) => {
            handleThoughtAdded(node);
            setSidebarOpen(false);
          }}
          onNodeSelect={handleNodeSelect}
          selectedNode={selectedNode}
          activeLineageId={activeLineageId}
          onClearLineage={() => setActiveLineageId(null)}
          isAdding={isAdding}
          setIsAdding={setIsAdding}
          data={data}
          onRefreshData={refreshData}
          onDelete={handleDelete}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Backdrop for mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Canvas Area */}
      <main className="flex-1 min-w-0 relative">
        {/* Top bar shadow/indicator */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-slate-50 to-transparent pointer-events-none z-10" />
        
        <ThoughtGraph 
          data={filteredData} 
          onNodeClick={(node) => handleNodeSelect(node, true)} // Clicks no graph NUNCA saltam para o último
          selectedId={selectedNode?.id}
          activeLineageId={activeLineageId}
          viewMode={viewMode}
        />

        {/* Floating Overlay for Tips */}
        <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl text-[10px] uppercase font-bold tracking-widest text-slate-500 shadow-xl pointer-events-none z-10">
          Navegue pela árvore • Clique nos nós • Evolua seu aprendizado
        </div>
      </main>

      {/* Side Details Overlay */}
      <AnimatePresence>
        {selectedNode && (
          <ThoughtDetail 
            node={selectedNode} 
            onClose={() => setSelectedNode(null)}
            onLinkClick={handleLinkClick}
            onEvolve={handleEvolve}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
