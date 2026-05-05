
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Brain, Database, X, ChevronRight, Zap, Target, MessageCircle, Sparkles, Loader2, GitGraph, ArrowDownRight, ArrowLeft, Send, RefreshCcw, ShieldCheck, Lightbulb, ImageIcon, Trash2 } from 'lucide-react';
import { ThoughtNode, ThoughtType, MentalArchitecture } from '../types';
import { addThought, getMentalData, getRootNodes, getRelevantNodes, analyzeMemory, createExampleLongevityProject } from '../lib/thoughts-store';
import { askMindArchitect, ChatMessage, generateEmbedding } from '../services/aiService';
import { MemoryCleaningModal } from './MemoryCleaningModal';

interface ThoughtControlsProps {
  onThoughtAdded: (node: ThoughtNode) => void;
  onNodeSelect: (node: ThoughtNode) => void;
  selectedNode: ThoughtNode | null;
  activeLineageId: string | null;
  onClearLineage: () => void;
  isAdding: boolean;
  setIsAdding: (val: boolean) => void;
  data: MentalArchitecture;
  onRefreshData: () => void;
  onDelete: (id: string) => void;
}

export default function ThoughtControls({ 
  onThoughtAdded, 
  onNodeSelect, 
  selectedNode, 
  activeLineageId, 
  onClearLineage,
  isAdding,
  setIsAdding,
  data,
  onRefreshData,
  onDelete
}: ThoughtControlsProps) {
  const [query, setQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<ThoughtType>('thought');
  const [activeTab, setActiveTab] = useState<'cores' | 'search' | 'history'>('cores');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCleaningOpen, setIsCleaningOpen] = useState(false);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title input when adding UI opens
  useEffect(() => {
    if (isAdding) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isAdding]);

  const memoryAnalysis = useMemo(() => analyzeMemory(data.nodes), [data.nodes]);

  const handleAddImage = () => {
    if (imageUrlInput.trim()) {
      setNewImages([...newImages, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleCreateExampleProject = () => {
    setIsCreating(true);
    try {
      const rootNode = createExampleLongevityProject();
      onThoughtAdded(rootNode);
      onRefreshData();
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateRafaelNode = async () => {
    const title = "O que é o sistema RAFAEL";
    const content = "RAFAEL é um sistema de memória estruturada baseado em nós. O objetivo é registrar ideias, aprendizados, hipóteses, projetos e dúvidas, conectando informações para criar um mapa evolutivo do meu pensamento. O sistema deve evitar interpretações falsas e só analisar dados reais registrados pelo usuário.";
    const tags = ["memória", "IA", "sistema", "pensamento", "organização"];
    
    setIsCreating(true);
    try {
      const embedding = await generateEmbedding(`${title} ${content}`);
      const node = addThought(title, content, 'projeto', undefined, [], embedding, tags);
      onThoughtAdded(node);
      onRefreshData();
    } catch (e) {
      const node = addThought(title, content, 'projeto', undefined, [], undefined, tags);
      onThoughtAdded(node);
      onRefreshData();
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      // Usar estritamente o nó selecionado como pai. Se não houver seleção, cria uma nova raiz.
      let effectiveParentId = selectedNode?.id;

      const embedding = await generateEmbedding(`${newTitle} ${newContent}`);
      const node = addThought(newTitle, newContent, newType, effectiveParentId, [], embedding, [], newImages);
      onThoughtAdded(node);
      setNewTitle('');
      setNewContent('');
      setNewImages([]);
      setIsAdding(false);
    } catch (err) {
      let effectiveParentId = selectedNode?.id;

      const node = addThought(newTitle, newContent, newType, effectiveParentId, [], undefined, [], newImages);
      onThoughtAdded(node);
      setNewTitle('');
      setNewContent('');
      setNewImages([]);
      setIsAdding(false);
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleAiSynthesis = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: query };
    setChatHistory(prev => [...prev, userMsg]);
    setIsAiLoading(true);
    setQuery('');

    try {
      // 1. Gerar embedding para a busca semântica da pergunta
      const queryEmbedding = await generateEmbedding(query);

      // 2. Se estiver em uma linhagem, foca apenas nos nós daquela linhagem para a IA
      // Mas agora usando a lógica de relevância para filtrar o melhor contexto (incluindo busca semântica)
      const contextNodes = getRelevantNodes(data.nodes, activeLineageId, queryEmbedding);
      const analysis = analyzeMemory(data.nodes);
      
      const response = await askMindArchitect(query, contextNodes, analysis, chatHistory);
      const aiMsg: ChatMessage = { role: 'model', text: response };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const types: { value: ThoughtType; label: string; icon: any; color: string; bg: string }[] = [
    { value: 'thought', label: 'Pensamento', icon: Brain, color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'fato', label: 'Fato', icon: Database, color: 'text-slate-600', bg: 'bg-slate-50' },
    { value: 'hipotese', label: 'Hipótese', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
    { value: 'sequencia', label: 'Sequência', icon: GitGraph, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { value: 'ideia', label: 'Ideia', icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { value: 'projeto', label: 'Projeto', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
    { value: 'duvida', label: 'Dúvida', icon: MessageCircle, color: 'text-pink-600', bg: 'bg-pink-50' },
    { value: 'discovery', label: 'Descoberta', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const roots = data.nodes.filter(n => !n.parentId);
  const history = [...data.nodes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);

  // Filter lineage items if focused
  const lineageNodes = React.useMemo(() => {
    if (!activeLineageId) return [];
    
    const visited = new Set<string>();
    const nodes: ThoughtNode[] = [];
    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const node = data.nodes.find(n => n.id === id);
      if (node) {
        nodes.push(node);
        data.nodes.filter(n => n.parentId === id).forEach(child => traverse(child.id));
        node.links.forEach(link => traverse(link));
      }
    };
    traverse(activeLineageId);
    return nodes.sort((a, b) => b.createdAt - a.createdAt);
  }, [activeLineageId, data.nodes]);

  return (
    <div className="w-full h-full bg-white border-r border-slate-200 flex flex-col font-sans text-slate-600 shadow-sm z-20">
      <MemoryCleaningModal 
        isOpen={isCleaningOpen}
        onClose={() => setIsCleaningOpen(false)}
        analysis={memoryAnalysis}
        onMemoryChanged={onRefreshData}
      />
      
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeLineageId ? (
            <button 
              onClick={onClearLineage}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Brain className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
              {activeLineageId ? lineageNodes.find(n => n.id === activeLineageId)?.title : 'RAFAEL'}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              {activeLineageId ? 'Foco em Linhagem' : 'Sua memoria'}
            </p>
          </div>
        </div>
        
        {/* Memory Integrity Indicator */}
        {!activeLineageId && (
          <button 
            onClick={() => setIsCleaningOpen(true)}
            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-all rounded-xl border border-transparent hover:border-rose-100 flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            <div className="text-left hidden md:block">
              <div className="text-[8px] font-black uppercase text-slate-500">Qualidade</div>
              <div className="text-[10px] font-bold text-rose-600">{memoryAnalysis.qualityReport?.noisePercentage.toFixed(0)}% Ruído</div>
            </div>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button 
          onClick={() => setActiveTab('cores')}
          className={`flex-1 p-3 text-[10px] uppercase font-bold tracking-widest transition-all ${activeTab === 'cores' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          {activeLineageId ? 'Evolução' : 'Memórias'}
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`flex-1 p-3 text-[10px] uppercase font-bold tracking-widest transition-all ${activeTab === 'search' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          IA Escavar
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 p-3 text-[10px] uppercase font-bold tracking-widest transition-all ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Logs
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {activeTab === 'cores' && (
          <div className="p-6 space-y-6">
            {!activeLineageId && data.nodes.length <= 5 && (
              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900">Memória Inicializada</h3>
                  <p className="text-[10px] text-indigo-600 font-medium">Pronta para o protocolo RAFAEL de registro estruturado.</p>
                </div>
                <button 
                  onClick={handleCreateRafaelNode}
                  disabled={isCreating}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isCreating ? 'PROCESSANDO...' : 'EXECUTAR PROTOCOLO RAFAEL'}
                </button>
                <div className="pt-2">
                  <button 
                    onClick={handleCreateExampleProject}
                    disabled={isCreating}
                    className="w-full py-3 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Target className="w-3 h-3" />
                    Gerar Exemplo: Projeto Genética
                  </button>
                </div>
              </div>
            )}
            
            {!activeLineageId && data.nodes.length > 5 && (
              <button 
                onClick={handleCreateExampleProject}
                disabled={isCreating}
                className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 mb-4"
              >
                <Database className="w-3 h-3" />
                Injetar Exemplo: Genética & Longevidade
              </button>
            )}
            
            {activeLineageId ? (
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span>Sequência Neural</span>
                  <span>{lineageNodes.length} nós</span>
                </div>
                {lineageNodes.map(node => (
                  <div 
                    key={node.id} 
                    onClick={() => onNodeSelect(node)}
                    className={`p-4 bg-white border rounded-xl hover:border-blue-500 cursor-pointer transition-all group shadow-sm flex justify-between items-start gap-4 ${selectedNode?.id === node.id ? 'border-blue-500 bg-blue-50/20 shadow-blue-500/5' : 'border-slate-100'}`}
                  >
                    <div className="flex-1 overflow-hidden">
                      <div className="text-[10px] text-slate-400 font-bold mb-1 flex justify-between">
                        <span className="uppercase">{node.type}</span>
                        <span>#{node.id.slice(0,4)}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{node.title}</div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Excluir este nó da sequência?')) onDelete(node.id);
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <GitGraph className="w-3 h-3" /> Linhagens Principais
                </div>
                {roots.length > 0 ? (
                  roots.map(node => (
                    <div 
                      key={node.id} 
                      onClick={() => onNodeSelect(node)}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-white cursor-pointer transition-all group shadow-sm flex justify-between items-start gap-4"
                    >
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">Raiz</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{node.id}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{node.title}</div>
                        <div className="text-xs text-slate-500 mt-2 line-clamp-2 italic">"{node.content}"</div>
                        <div className="mt-3 text-[10px] text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Expandir Razão <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Excluir esta linhagem e todas as suas conexões?')) onDelete(node.id);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Plus className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 italic">Crie um novo começo para iniciar seu núcleo mental.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col p-6 h-full">
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar pr-2">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <Sparkles className="w-12 h-12 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">IA Escavadora Chat</h3>
                    <p className="text-xs text-slate-500 px-4">Conversem sobre seu aprendizado. Ela sabe tudo o que você arquivou.</p>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed transition-all shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-700 border border-slate-200 rounded-bl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 border border-slate-200 p-3 rounded-2xl rounded-bl-none animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                </div>
              )}
            </div>
            
            <form onSubmit={handleAiSynthesis} className="relative">
              <input 
                type="text" 
                placeholder="Pergunte ao Arquiteto..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button 
                type="submit"
                disabled={isAiLoading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-30 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6 space-y-3">
            {history.map(node => (
              <div 
                key={node.id} 
                onClick={() => onNodeSelect(node)}
                className={`flex items-center gap-3 p-3 bg-white border rounded-xl hover:border-slate-100 hover:bg-slate-50 cursor-pointer transition-all shadow-sm ${selectedNode?.id === node.id ? 'border-blue-500' : 'border-transparent'}`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  node.type === 'thought' ? 'bg-blue-500' :
                  node.type === 'emotion' ? 'bg-pink-500' :
                  node.type === 'discovery' ? 'bg-emerald-500' :
                  node.type === 'project' ? 'bg-amber-500' : 'bg-purple-500'
                }`} />
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-800 line-clamp-1">{node.title}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{new Date(node.createdAt).toLocaleDateString()}</div>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-300" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Evolution Area */}
      <div className="p-6 bg-slate-50 border-t border-slate-200">
        {!isAdding ? (
          <div className="space-y-3">
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-blue-100 border border-blue-200 rounded-xl">
                  <ArrowDownRight className="w-4 h-4 text-blue-600" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter leading-none mb-1">Evoluir de:</p>
                    <p className="text-xs font-bold text-blue-900 truncate">{selectedNode.title}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-xs font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Plus className="w-4 h-4" /> Evoluir
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 text-xs font-bold hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" /> Novo Núcleo Mental
              </button>
            )}
          </div>
        ) : (
          <motion.form 
            initial={{ opacity: 0, y: 15, backgroundColor: 'rgba(59, 130, 246, 0.2)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)' }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              backgroundColor: 'rgba(59, 130, 246, 0)',
              boxShadow: '0 0 0 0px rgba(59, 130, 246, 0)',
              transition: { duration: 1, ease: "easeOut" }
            }}
            className="space-y-4 rounded-xl p-3 -m-3 border border-transparent"
            onSubmit={handleAddSubmit}
          >
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {selectedNode ? 'Efeito Evolutivo' : 'Novo Começo'}
              </span>
              <button type="button" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4 hover:text-slate-600" />
              </button>
            </div>
            
            <input 
              ref={titleInputRef}
              type="text" 
              placeholder={selectedNode ? "Qual a descoberta seguinte?" : "Meta-objetivo do núcleo..."} 
              required
              className="w-full bg-white border border-blue-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans font-medium shadow-sm animate-in fade-in zoom-in duration-300"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            <textarea 
              placeholder="Explique este passo da arquitetura..." 
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 resize-none transition-all font-sans"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />

            {/* Image URLs Input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="URL de imagem (evidência)..."
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImage())}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-medium focus:outline-none focus:border-indigo-400 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="p-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {newImages.length > 0 && (
                <div className="flex gap-2 p-2 bg-slate-100/50 rounded-xl overflow-x-auto custom-scrollbar">
                  {newImages.map((img, idx) => (
                    <div key={idx} className="relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                      <img src={img} className="w-full h-full object-cover" alt="preview" onError={(e) => (e.target as any).src = 'https://images.unsplash.com/photo-1544396821-4dd40b938ad3?q=80&w=100'} />
                      <button 
                        type="button"
                        onClick={() => setNewImages(newImages.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {types.map(t => (
                <button
                  key={t.value}
                  type="button"
                  title={t.label}
                  onClick={() => setNewType(t.value)}
                  className={`flex-1 min-w-[40px] p-2 rounded-lg flex items-center justify-center border transition-all ${newType === t.value ? `bg-white border-blue-500 shadow-md` : 'bg-white border-slate-100 hover:border-slate-200'}`}
                >
                  <t.icon className={`w-4 h-4 ${newType === t.value ? t.color : 'text-slate-300'}`} />
                </button>
              ))}
            </div>

            <button 
              type="submit"
              disabled={isCreating}
              className={`w-full py-3 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${selectedNode ? 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700' : 'bg-blue-600 shadow-blue-500/20 hover:bg-blue-700'} ${isCreating ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando Vetores...
                </>
              ) : (
                selectedNode ? 'Confirmar Expansão' : 'Iniciar Arquitetura'
              )}
            </button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
