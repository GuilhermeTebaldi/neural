import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, AlertTriangle, CheckCircle, RefreshCcw, Info, Trash, ShieldAlert } from 'lucide-react';
import { ThoughtNode, MemoryAnalysis } from '../types';
import { deleteMultipleNodes, resetMemory, getNodeQuality, getMentalData } from '../lib/thoughts-store';

interface MemoryCleaningModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: MemoryAnalysis;
  onMemoryChanged: () => void;
}

export const MemoryCleaningModal: React.FC<MemoryCleaningModalProps> = ({ 
  isOpen, 
  onClose, 
  analysis,
  onMemoryChanged 
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetConfirmText, setResetConfirmText] = useState('');
  
  const allNodes = useMemo(() => getMentalData().nodes, [isOpen]);
  
  const categorized = useMemo(() => {
    const groups = {
      noise: [] as ThoughtNode[],
      shallow: [] as ThoughtNode[],
      valid: [] as ThoughtNode[]
    };
    allNodes.forEach(node => {
      const q = getNodeQuality(node);
      groups[q].push(node);
    });
    return groups;
  }, [allNodes]);

  // Pre-select noise nodes by default
  useState(() => {
    const noiseIds = categorized.noise.map(n => n.id);
    setSelectedIds(new Set(noiseIds));
  });

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    deleteMultipleNodes(Array.from(selectedIds));
    onMemoryChanged();
    onClose();
  };

  const handleFullReset = () => {
    if (resetConfirmText.toUpperCase() === 'RESETAR') {
      resetMemory();
      onMemoryChanged();
      onClose();
      setResetStep(0);
      setResetConfirmText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl">
              <RefreshCcw className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">Limpeza da Memória</h2>
              <p className="text-xs text-gray-500 font-medium">Saneamento e otimização da malha neural</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Summary Section */}
          <section className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xl font-bold text-slate-900">{allNodes.length}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Total</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <span className="block text-xl font-bold text-emerald-600">{categorized.valid.length}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500">Válidos</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center font-medium">
              <span className="block text-xl font-bold text-amber-600">{categorized.shallow.length}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500">Rasos</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-center">
              <span className="block text-xl font-bold text-rose-600">{categorized.noise.length}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-rose-500">Ruído</span>
            </div>
          </section>

          {/* List Section */}
          <div className="space-y-6">
            <CategorySection 
              title="Ruído Estrutural" 
              subtitle="Conteúdo sem significado, caracteres aleatórios ou muito curto."
              nodes={categorized.noise}
              selectedIds={selectedIds}
              onToggle={toggleSelection}
              colorClass="text-rose-600 bg-rose-50"
            />
            
            <CategorySection 
              title="Conteúdo Raso" 
              subtitle="Nós com pouco detalhamento ou contexto explicativo."
              nodes={categorized.shallow}
              selectedIds={selectedIds}
              onToggle={toggleSelection}
              colorClass="text-amber-600 bg-amber-50"
            />
          </div>

          {/* Dangerous Zone */}
          <div className="pt-6 border-t border-gray-100">
            {resetStep === 0 ? (
              <button 
                onClick={() => setResetStep(1)}
                className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-bold text-sm transition-colors py-2 px-4 rounded-xl hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
                Resetar memória inteira
              </button>
            ) : resetStep === 1 ? (
              <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl space-y-4">
                <div className="flex items-start gap-4">
                  <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-rose-900">Confirmação Crítica</h4>
                    <p className="text-sm text-rose-700">Deseja realmente resetar toda a memória? Esta ação apagará todos os nós e conexões locais de forma irreversível.</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setResetStep(2)} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider">Confirmar</button>
                  <button onClick={() => setResetStep(0)} className="flex-1 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl font-bold text-xs uppercase tracking-wider">Voltar</button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-rose-600 rounded-2xl space-y-4 text-white">
                <h4 className="font-bold">Ação Final de Segurança</h4>
                <p className="text-sm opacity-90 font-medium">Digite <span className="font-black underline italic">RESETAR</span> abaixo para confirmar a destruição de dados.</p>
                <input 
                  autoFocus
                  type="text"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="DIGITE AQUI"
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-xl outline-none focus:bg-white/20 transition-all font-black text-center uppercase tracking-widest"
                />
                <button 
                  disabled={resetConfirmText.toUpperCase() !== 'RESETAR'}
                  onClick={handleFullReset}
                  className="w-full py-3 bg-white text-rose-600 rounded-xl font-black text-xs disabled:opacity-30 uppercase tracking-widest transition-opacity"
                >
                  Destruir Memória
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3 sticky bottom-0 z-10">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl text-gray-500 text-xs font-bold hover:bg-gray-100 transition-all uppercase tracking-wider"
          >
            Fechar
          </button>
          <button 
            disabled={selectedIds.size === 0}
            onClick={handleBatchDelete}
            className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-900/10 disabled:opacity-50 uppercase tracking-wider"
          >
            <Trash className="w-4 h-4" />
            Remover ({selectedIds.size}) Selecionados
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface CategorySectionProps {
  title: string;
  subtitle: string;
  nodes: ThoughtNode[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  colorClass: string;
}

const CategorySection: React.FC<CategorySectionProps> = ({ title, subtitle, nodes, selectedIds, onToggle, colorClass }) => {
  if (nodes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${colorClass}`}>
          {nodes.length} encontrados
        </span>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {nodes.map(node => (
          <div 
            key={node.id}
            onClick={() => onToggle(node.id)}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedIds.has(node.id) ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-100 hover:border-gray-200'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${selectedIds.has(node.id) ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-200'}`}>
                {selectedIds.has(node.id) && <CheckCircle className="w-3.3 h-3.3 text-white" />}
              </div>
              <div className="max-w-[300px]">
                <h4 className="text-sm font-bold text-gray-800 truncate">{node.title || 'Sem título'}</h4>
                <p className="text-[10px] text-gray-500 truncate">{node.content || 'Sem conteúdo'}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-gray-400">{(node.title + node.content).length} chars</span>
          </div>
        ))}
      </div>
    </div>
  );
}
