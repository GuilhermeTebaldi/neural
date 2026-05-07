import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Clock, Hash, Trash2, X, AlertCircle, Plus, ImageIcon, Edit3, Save, RotateCcw, Loader2 } from 'lucide-react';
import { ThoughtNode, ThoughtType } from '../types';

interface ThoughtDetailProps {
  node: ThoughtNode | null;
  onClose: () => void;
  onLinkClick: (id: string) => void;
  onEvolve: (
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
  ) => Promise<void> | void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
}

const parseList = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseConfidenceInput = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed.replace(',', '.'));
  if (Number.isNaN(parsed)) return undefined;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const formatManualConfidence = (value: number): string =>
  `${Math.max(0, Math.min(100, Math.round(value)))}%`;

export default function ThoughtDetail({ node, onClose, onLinkClick, onEvolve, onDelete, onUpdate }: ThoughtDetailProps) {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editContent, setEditContent] = React.useState('');
  const [editType, setEditType] = React.useState<ThoughtType>('thought');
  const [editImages, setEditImages] = React.useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = React.useState('');
  const [isEvolving, setIsEvolving] = React.useState(false);
  const [isCreatingEvolution, setIsCreatingEvolution] = React.useState(false);
  const [evolveTitle, setEvolveTitle] = React.useState('');
  const [evolveContent, setEvolveContent] = React.useState('');
  const [evolveType, setEvolveType] = React.useState<ThoughtType>('thought');
  const [evolveSource, setEvolveSource] = React.useState('');
  const [evolvePeriod, setEvolvePeriod] = React.useState('');
  const [evolveFactualConfidence, setEvolveFactualConfidence] = React.useState('');
  const [evolveHypothesisConfidence, setEvolveHypothesisConfidence] = React.useState('');
  const [evolveEvidenceConfidence, setEvolveEvidenceConfidence] = React.useState('');
  const [evolveTags, setEvolveTags] = React.useState('');
  const [evolveHypotheses, setEvolveHypotheses] = React.useState('');
  const [evolveEvidences, setEvolveEvidences] = React.useState('');
  const [editSource, setEditSource] = React.useState('');
  const [editPeriod, setEditPeriod] = React.useState('');
  const [editFactualConfidence, setEditFactualConfidence] = React.useState('');
  const [editHypothesisConfidence, setEditHypothesisConfidence] = React.useState('');
  const [editEvidenceConfidence, setEditEvidenceConfidence] = React.useState('');
  const [editTags, setEditTags] = React.useState('');
  const [editHypotheses, setEditHypotheses] = React.useState('');
  const [editEvidences, setEditEvidences] = React.useState('');

  React.useEffect(() => {
    if (node) {
      setEditTitle(node.title);
      setEditContent(node.content);
      setEditType(node.type);
      setEditImages(node.images || []);
      setIsEditing(false);
      setShowConfirm(false);
      setIsEvolving(false);
      setIsCreatingEvolution(false);
      setEvolveTitle('');
      setEvolveContent('');
      setEvolveType('thought');
      setEvolveSource('');
      setEvolvePeriod('');
      setEvolveFactualConfidence('');
      setEvolveHypothesisConfidence('');
      setEvolveEvidenceConfidence('');
      setEvolveTags('');
      setEvolveHypotheses('');
      setEvolveEvidences('');
      setEditSource(node.source || '');
      setEditPeriod(node.period || '');
      setEditFactualConfidence(node.factualConfidence !== undefined ? String(node.factualConfidence) : '');
      setEditHypothesisConfidence(node.hypothesisConfidence !== undefined ? String(node.hypothesisConfidence) : '');
      setEditEvidenceConfidence(node.evidenceConfidence !== undefined ? String(node.evidenceConfidence) : '');
      setEditTags((node.tags || []).join(', '));
      setEditHypotheses((node.hypotheses || []).join('\n'));
      setEditEvidences((node.evidences || []).join('\n'));
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    onUpdate(node.id, {
      title: editTitle,
      content: editContent,
      type: editType,
      images: editImages,
      source: editSource.trim() || undefined,
      period: editPeriod.trim() || undefined,
      factualConfidence: parseConfidenceInput(editFactualConfidence),
      hypothesisConfidence: parseConfidenceInput(editHypothesisConfidence),
      evidenceConfidence: parseConfidenceInput(editEvidenceConfidence),
      tags: parseList(editTags),
      hypotheses: parseList(editHypotheses),
      evidences: parseList(editEvidences)
    });
    setIsEditing(false);
  };

  const handleAddImage = () => {
    if (imageUrlInput.trim()) {
      setEditImages([...editImages, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const removeImage = (index: number) => {
    setEditImages(editImages.filter((_, i) => i !== index));
  };

  const handleDelete = () => {
    onDelete(node.id);
    setShowConfirm(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(node.title);
    setEditContent(node.content);
    setEditType(node.type);
    setEditImages(node.images || []);
    setImageUrlInput('');
    setEditSource(node.source || '');
    setEditPeriod(node.period || '');
    setEditFactualConfidence(node.factualConfidence !== undefined ? String(node.factualConfidence) : '');
    setEditHypothesisConfidence(node.hypothesisConfidence !== undefined ? String(node.hypothesisConfidence) : '');
    setEditEvidenceConfidence(node.evidenceConfidence !== undefined ? String(node.evidenceConfidence) : '');
    setEditTags((node.tags || []).join(', '));
    setEditHypotheses((node.hypotheses || []).join('\n'));
    setEditEvidences((node.evidences || []).join('\n'));
    setIsEditing(false);
  };

  const handleCreateEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evolveTitle.trim() || isCreatingEvolution) return;

    setIsCreatingEvolution(true);
    try {
      await onEvolve(node.id, {
        title: evolveTitle.trim(),
        content: evolveContent.trim(),
        type: evolveType,
        source: evolveSource.trim() || undefined,
        period: evolvePeriod.trim() || undefined,
        factualConfidence: parseConfidenceInput(evolveFactualConfidence),
        hypothesisConfidence: parseConfidenceInput(evolveHypothesisConfidence),
        evidenceConfidence: parseConfidenceInput(evolveEvidenceConfidence),
        tags: parseList(evolveTags),
        hypotheses: parseList(evolveHypotheses),
        evidences: parseList(evolveEvidences)
      });
      setIsEvolving(false);
      setEvolveTitle('');
      setEvolveContent('');
      setEvolveType('thought');
      setEvolveSource('');
      setEvolvePeriod('');
      setEvolveFactualConfidence('');
      setEvolveHypothesisConfidence('');
      setEvolveEvidenceConfidence('');
      setEvolveTags('');
      setEvolveHypotheses('');
      setEvolveEvidences('');
    } finally {
      setIsCreatingEvolution(false);
    }
  };

  const evolveTypes: ThoughtType[] = ['thought', 'fato', 'hipotese', 'projeto', 'sequencia', 'ideia', 'duvida', 'discovery'];
  const isEvolutionMode = isEvolving && !isEditing;

  const handleCancelEvolution = () => {
    setIsEvolving(false);
    setEvolveTitle('');
    setEvolveContent('');
    setEvolveType('thought');
    setEvolveSource('');
    setEvolvePeriod('');
    setEvolveFactualConfidence('');
    setEvolveHypothesisConfidence('');
    setEvolveEvidenceConfidence('');
    setEvolveTags('');
    setEvolveHypotheses('');
    setEvolveEvidences('');
  };

  const relationRefs = Array.from(new Set([...(node.parentId ? [node.parentId] : []), ...node.links]));
  const hypotheses = node.hypotheses || [];
  const evidences = node.evidences || node.images || [];
  const hasSource = Boolean(node.source?.trim());
  const hasPeriod = Boolean(node.period?.trim());
  const hasFactualConfidence = node.factualConfidence !== undefined && node.factualConfidence !== null;
  const hasHypothesisConfidence = node.hypothesisConfidence !== undefined && node.hypothesisConfidence !== null;
  const hasEvidenceConfidence = node.evidenceConfidence !== undefined && node.evidenceConfidence !== null;
  const hasTags = node.tags.length > 0;
  const hasRelations = relationRefs.length > 0;
  const hasHypotheses = hypotheses.length > 0;
  const hasEvidences = evidences.length > 0;
  const hasManualMetadata =
    hasSource ||
    hasPeriod ||
    hasFactualConfidence ||
    hasHypothesisConfidence ||
    hasEvidenceConfidence ||
    hasTags ||
    hasRelations ||
    hasHypotheses ||
    hasEvidences;
  const evolutionForm = (
    <form onSubmit={handleCreateEvolution} className="p-5 border border-indigo-100 bg-indigo-50/30 rounded-2xl space-y-3 shadow-sm">
      <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-500">
        Metadados manuais
      </div>
      <input
        value={evolveSource}
        onChange={(e) => setEvolveSource(e.target.value)}
        placeholder="Fonte (manual)"
        className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500"
      />
      <input
        value={evolvePeriod}
        onChange={(e) => setEvolvePeriod(e.target.value)}
        placeholder="Data ou período (manual)"
        className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500"
      />
      <div className="grid grid-cols-1 gap-2">
        <input
          value={evolveFactualConfidence}
          onChange={(e) => setEvolveFactualConfidence(e.target.value)}
          placeholder="Confiab. factual (0-100)"
          className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500"
        />
        <input
          value={evolveHypothesisConfidence}
          onChange={(e) => setEvolveHypothesisConfidence(e.target.value)}
          placeholder="Confiab. hipótese (0-100)"
          className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500"
        />
        <input
          value={evolveEvidenceConfidence}
          onChange={(e) => setEvolveEvidenceConfidence(e.target.value)}
          placeholder="Confiab. evidência (0-100)"
          className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500"
        />
      </div>
      <input
        value={evolveTags}
        onChange={(e) => setEvolveTags(e.target.value)}
        placeholder="Tags (separe por vírgula)"
        className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500"
      />
      <textarea
        value={evolveHypotheses}
        onChange={(e) => setEvolveHypotheses(e.target.value)}
        rows={2}
        placeholder="Hipóteses associadas (uma por linha ou vírgula)"
        className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500 resize-none"
      />
      <textarea
        value={evolveEvidences}
        onChange={(e) => setEvolveEvidences(e.target.value)}
        rows={2}
        placeholder="Evidências associadas (uma por linha ou vírgula)"
        className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500 resize-none"
      />
      <input
        value={evolveTitle}
        onChange={(e) => setEvolveTitle(e.target.value)}
        placeholder="Título da evolução"
        required
        className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500"
      />
      <textarea
        value={evolveContent}
        onChange={(e) => setEvolveContent(e.target.value)}
        placeholder="Contexto da evolução"
        rows={3}
        className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:border-indigo-500 resize-none"
      />
      <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-500">
        Tipo de Conexão
      </div>
      <div className="flex flex-wrap gap-2">
        {evolveTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setEvolveType(type)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
              evolveType === type
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCancelEvolution}
          className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isCreatingEvolution || !evolveTitle.trim()}
          className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isCreatingEvolution ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar evolução'
          )}
        </button>
      </div>
    </form>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: window.innerWidth < 768 ? 0 : 100, y: window.innerWidth < 768 ? 100 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: window.innerWidth < 768 ? 0 : 100, y: window.innerWidth < 768 ? 100 : 0 }}
      className="fixed inset-x-3 bottom-3 top-20 md:inset-x-auto md:right-6 md:top-6 md:bottom-6 md:w-96 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl flex flex-col z-50 font-sans"
    >
      {!isEvolutionMode && (
        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
          <div className="space-y-2 flex-1 pr-4">
            {isEditing ? (
              <input 
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold text-slate-900 tracking-tight w-full bg-slate-50 border-b-2 border-indigo-500 focus:outline-none p-1 rounded"
                placeholder="Título do pensamento..."
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    node.type === 'thought' ? 'bg-blue-500' :
                    node.type === 'emotion' ? 'bg-pink-500' :
                    node.type === 'discovery' ? 'bg-emerald-500' :
                    node.type === 'project' ? 'bg-amber-500' : 'bg-purple-500'
                  }`} />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{node.type}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{node.title}</h2>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors shadow-sm bg-white border border-indigo-100 text-xs font-bold"
              >
                <span className="inline-flex items-center gap-1"><Edit3 className="w-4 h-4" /> Editar</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100 bg-white shadow-sm">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative">
        <AnimatePresence>
          {showConfirm && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md p-8 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Confirmar Exclusão?</h3>
                <p className="text-xs text-slate-500">Essa ação é irreversível e removerá este nó da sua malha neural.</p>
              </div>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-200"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isEvolutionMode ? (
          <section className="pt-1">
            {evolutionForm}
          </section>
        ) : (
          <>
        {isEditing && (
          <section className="space-y-4">
            <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 flex items-center gap-2">
              <ImageIcon className="w-3 h-3" /> Tipo de Conexão
            </div>
            <div className="flex flex-wrap gap-2">
              {['thought', 'fato', 'hipotese', 'projeto', 'sequencia', 'ideia', 'duvida', 'discovery'].map((t) => (
                <button
                  key={t}
                  onClick={() => setEditType(t as ThoughtType)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${
                    editType === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>
        )}

        {isEditing && (
          <section className="space-y-4">
            <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">
              Metadados manuais
            </div>
            <div className="grid grid-cols-1 gap-3">
              <input
                value={editSource}
                onChange={(e) => setEditSource(e.target.value)}
                placeholder="Fonte (manual)"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <input
                value={editPeriod}
                onChange={(e) => setEditPeriod(e.target.value)}
                placeholder="Data ou período (manual)"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  value={editFactualConfidence}
                  onChange={(e) => setEditFactualConfidence(e.target.value)}
                  placeholder="Confiab. factual (0-100)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <input
                  value={editHypothesisConfidence}
                  onChange={(e) => setEditHypothesisConfidence(e.target.value)}
                  placeholder="Confiab. hipótese (0-100)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <input
                  value={editEvidenceConfidence}
                  onChange={(e) => setEditEvidenceConfidence(e.target.value)}
                  placeholder="Confiab. evidência (0-100)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
              <input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Tags (separe por vírgula)"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <textarea
                value={editHypotheses}
                onChange={(e) => setEditHypotheses(e.target.value)}
                rows={2}
                placeholder="Hipóteses associadas (uma por linha ou vírgula)"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
              />
              <textarea
                value={editEvidences}
                onChange={(e) => setEditEvidences(e.target.value)}
                rows={2}
                placeholder="Evidências associadas (uma por linha ou vírgula)"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </section>
        )}

        {/* Images Gallery */}
        {(isEditing || (node.images && node.images.length > 0)) && (
          <section className="space-y-4">
            <div className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 flex items-center gap-2">
              <ImageIcon className="w-3 h-3" /> {isEditing ? 'Gerenciar Evidências' : 'Evidências Visuais'}
            </div>
            
            {isEditing && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input 
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="URL da nova imagem..."
                    className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={handleAddImage}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className={`grid ${isEditing ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
              {(isEditing ? editImages : node.images || []).map((img, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={isEditing ? {} : { scale: 1.02 }}
                  className="relative group rounded-xl overflow-hidden border border-slate-100 shadow-sm aspect-video bg-slate-50"
                >
                  <img 
                    src={img} 
                    alt={`Evidence ${idx + 1}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => (e.target as any).src = 'https://images.unsplash.com/photo-1544396821-4dd40b938ad3?q=80&w=200'}
                  />
                  {isEditing && (
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg shadow-lg opacity-80 hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </motion.div>
              ))}
              {isEditing && editImages.length === 0 && (
                <div className="col-span-2 py-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-300 gap-2">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[10px] uppercase font-bold">Nenhuma imagem</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Content */}
        <section className="space-y-3">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
            <Hash className="w-3 h-3" /> Contexto
          </div>
          {isEditing ? (
            <textarea 
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-44 text-sm text-slate-700 leading-relaxed bg-slate-50 p-5 rounded-2xl border-2 border-indigo-100 focus:outline-none focus:border-indigo-500 shadow-inner resize-none"
              placeholder="Descreva este nó mental..."
            />
          ) : (
            <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 whitespace-pre-wrap shadow-inner custom-scrollbar overflow-y-auto max-h-[30vh] md:max-h-[24vh]">
              {node.content || 'Nenhuma descrição detalhada fornecida.'}
            </div>
          )}
        </section>

        {/* Metadata */}
        <section className="grid grid-cols-2 gap-4">
          <div className="space-y-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Registrado
            </div>
            <div className="text-xs text-slate-600 font-semibold">{new Date(node.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="space-y-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Share2 className="w-3 h-3" /> Identidade
            </div>
            <div className="text-xs text-slate-600 font-mono font-bold uppercase">{node.id}</div>
          </div>
        </section>

        {!isEditing && hasManualMetadata && (
          <section className="space-y-4">
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Metadados avançados
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {hasSource && (
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="uppercase font-bold tracking-widest text-[10px] text-slate-400">Fonte</div>
                  <div className="mt-1 text-slate-700">{node.source}</div>
                </div>
              )}
              {hasPeriod && (
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="uppercase font-bold tracking-widest text-[10px] text-slate-400">Data / período</div>
                  <div className="mt-1 text-slate-700">{node.period}</div>
                </div>
              )}
              {hasFactualConfidence && (
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="uppercase font-bold tracking-widest text-[10px] text-slate-400">Confiabilidade factual</div>
                  <div className="mt-1 text-slate-700">
                    {formatManualConfidence(node.factualConfidence as number)}
                  </div>
                </div>
              )}
              {hasHypothesisConfidence && (
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="uppercase font-bold tracking-widest text-[10px] text-slate-400">Confiabilidade da hipótese</div>
                  <div className="mt-1 text-slate-700">
                    {formatManualConfidence(node.hypothesisConfidence as number)}
                  </div>
                </div>
              )}
              {hasEvidenceConfidence && (
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                  <div className="uppercase font-bold tracking-widest text-[10px] text-slate-400">Confiabilidade da evidência</div>
                  <div className="mt-1 text-slate-700">
                    {formatManualConfidence(node.evidenceConfidence as number)}
                  </div>
                </div>
              )}
            </div>

            {hasTags && (
              <div className="space-y-2">
                <div className="uppercase font-bold tracking-widest text-[10px] text-slate-400">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {node.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] text-slate-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasRelations && (
              <div className="space-y-2">
                <div className="uppercase font-bold tracking-widest text-[10px] text-slate-400">Relações com outros nós</div>
                <div className="flex flex-wrap gap-2">
                  {relationRefs.map((ref) => (
                    <button
                      key={ref}
                      onClick={() => onLinkClick(ref)}
                      className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(hasHypotheses || hasEvidences) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hasHypotheses && (
                  <div className="space-y-2">
                    <div className="uppercase font-bold tracking-widest text-[10px] text-slate-400">Hipóteses associadas</div>
                    <div className="flex flex-wrap gap-2">
                      {hypotheses.map((item) => (
                        <span key={item} className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] text-slate-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {hasEvidences && (
                  <div className="space-y-2">
                    <div className="uppercase font-bold tracking-widest text-[10px] text-slate-400">Evidências associadas</div>
                    <div className="flex flex-wrap gap-2">
                      {evidences.map((item) => (
                        <span key={item} className="px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[11px] text-slate-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Connections */}
        <section className="space-y-3">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-2">
            <Share2 className="w-3 h-3" /> Arquitetura Genealógica
          </div>

          {!isEditing && (
            <button 
              onClick={() => setIsEvolving(true)}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-xs font-bold hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all mb-4"
            >
              <Plus className="w-4 h-4" /> Evoluir este raciocínio
            </button>
          )}

          <div className="space-y-2">
            {node.parentId && (
              <div 
                onClick={() => onLinkClick(node.parentId!)}
                className="p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 group transition-all shadow-sm"
              >
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-1">ORIGEM / ANCESTRAL</div>
                <div className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Ver nó de origem</div>
              </div>
            )}
            {node.links.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {node.links.map(linkId => (
                  <div 
                    key={linkId}
                    onClick={() => onLinkClick(linkId)}
                    className="p-3 bg-slate-50 border border-slate-100 border-dashed rounded-lg text-[10px] text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all font-bold uppercase"
                  >
                    REF: {linkId}
                  </div>
                ))}
              </div>
            ) : !node.parentId && (
              <div className="text-xs text-slate-300 italic flex items-center gap-2 py-4 justify-center border border-dashed border-slate-200 rounded-xl">
                <AlertCircle className="w-3 h-3" /> Sem conexões descendentes.
              </div>
            )}
          </div>
        </section>
          </>
        )}
      </div>

      {!isEvolutionMode && (
        <div className="p-6 border-t border-slate-100 flex justify-between items-center text-[10px]">
          {isEditing ? (
            <div className="w-full flex gap-3">
              <button 
                onClick={handleCancelEdit}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3 h-3" /> Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 h-10"
              >
                <Save className="w-3 h-3" /> Salvar
              </button>
            </div>
          ) : (
            <>
              <span className="text-slate-400 font-bold tracking-tighter">MINDCORE v1.0</span>
              <button 
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 text-slate-300 hover:text-red-500 transition-colors uppercase font-bold tracking-widest"
              >
                <Trash2 className="w-3 h-3" /> Deletar
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
