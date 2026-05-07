import { MentalArchitecture, ThoughtNode, ThoughtType, MemoryAnalysis } from '../types';

const STORAGE_KEY = 'mind_architect_data';
const SYSTEM_VERSION = 2;

const subscribers: (() => void)[] = [];

export function subscribe(callback: () => void) {
  subscribers.push(callback);
  return () => {
    const index = subscribers.indexOf(callback);
    if (index > -1) subscribers.splice(index, 1);
  };
}

function notifySubscribers() {
  subscribers.forEach(cb => cb());
}

const DEFAULT_DATA: MentalArchitecture = {
  version: SYSTEM_VERSION,
  nodes: [
    {
      id: 'root',
      title: 'Consciência Inicial',
      content: 'O ponto de partida da sua arquitetura mental.',
      type: 'discovery',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      importance: 1,
      confidence: 1,
      score: 1,
      links: [],
      connections: [],
      tags: ['base']
    }
  ],
  links: []
};

// Debug Logger
const logger = {
  info: (msg: string, data?: any) => console.log(`[MindCore:INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[MindCore:WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[MindCore:ERROR] ${msg}`, data || '')
};

function computeNodeScore(
  node: Partial<ThoughtNode>,
  minTs: number,
  maxTs: number
): number {
  const ts = Math.max(node.createdAt || 0, node.updatedAt || 0);
  const range = maxTs - minTs;
  const recency = range <= 0 ? 1 : (ts - minTs) / range;
  
  const importance = node.importance !== undefined ? node.importance : 0.5;
  const confidence = node.confidence !== undefined ? node.confidence : 0.5;
  
  return (importance * 0.5) + (confidence * 0.3) + (recency * 0.2);
}

function hydrateNode(node: any, minTs: number, maxTs: number): ThoughtNode {
  const hydrated = {
    ...node,
    updatedAt: node.updatedAt || node.createdAt || Date.now(),
    importance: node.importance !== undefined ? node.importance : 0.5,
    confidence: node.confidence !== undefined ? node.confidence : 0.5,
    connections: node.connections || [],
    contradiz: node.contradiz || [],
    type: node.type || 'hipotese',
    tags: node.tags || [],
    links: node.links || []
  };

  return {
    ...hydrated,
    score: computeNodeScore(hydrated, minTs, maxTs)
  };
}

export function getMentalData(): MentalArchitecture {
  const dataStr = localStorage.getItem(STORAGE_KEY);
  let architecture: MentalArchitecture;
  
  if (!dataStr) {
    logger.info("Initializing new storage.");
    architecture = { ...DEFAULT_DATA };
  } else {
    try {
      architecture = JSON.parse(dataStr);
      // Migration logic
      if (!architecture.version || architecture.version < SYSTEM_VERSION) {
        logger.warn(`Migrating data from version ${architecture.version || 0} to ${SYSTEM_VERSION}`);
        architecture.version = SYSTEM_VERSION;
      }
    } catch (e) {
      logger.error("Corruption detected in storage. Reverting to default.", e);
      architecture = { ...DEFAULT_DATA };
    }
  }

  // Calculate min/max timestamps for normalization
  const timestamps = architecture.nodes.map(n => Math.max(n.createdAt || 0, n.updatedAt || 0));
  const minTs = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
  const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();

  // Auto-enrichment of existing nodes
  architecture.nodes = architecture.nodes.map(n => hydrateNode(n, minTs, maxTs));

  // Safety: Remove broken links to non-existent nodes
  const nodeIds = new Set(architecture.nodes.map(n => n.id));
  architecture.nodes.forEach(node => {
    node.links = node.links.filter(id => nodeIds.has(id));
    node.connections = node.connections.filter(id => nodeIds.has(id));
    if (node.parentId && !nodeIds.has(node.parentId)) {
      node.parentId = undefined;
    }
  });
  architecture.links = architecture.links.filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));

  return architecture;
}

export function saveMentalData(data: MentalArchitecture) {
  try {
    data.version = SYSTEM_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    logger.error("Failed to save mental data.", e);
  }
}

function calculateSimilarity(t1: string, c1: string, t2: string, c2: string): boolean {
  const text1 = `${t1} ${c1}`.toLowerCase();
  const text2 = `${t2} ${c2}`.toLowerCase();
  
  const words1 = new Set(text1.match(/\b\w{4,}\b/g) || []); // Only words with 4+ characters
  const words2 = new Set(text2.match(/\b\w{4,}\b/g) || []);
  
  let intersection = 0;
  words1.forEach(word => {
    if (words2.has(word)) intersection++;
  });
  
  return intersection >= 2; // Connect if at least 2 meaningful words match
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (mA * mB);
}

export function findSimilarNodes(targetEmbedding: number[], nodes: ThoughtNode[], limit = 5): ThoughtNode[] {
  if (!targetEmbedding || targetEmbedding.length === 0) return [];
  
  return nodes
    .filter(n => n.embedding && n.embedding.length > 0)
    .map(n => ({ node: n, similarity: cosineSimilarity(targetEmbedding, n.embedding!) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(x => x.node);
}

export function connectNodes(nodeAId: string, nodeBId: string): void {
  const data = getMentalData();
  const nodeA = data.nodes.find(n => n.id === nodeAId);
  const nodeB = data.nodes.find(n => n.id === nodeBId);
  
  if (nodeA && nodeB) {
    logger.info(`Manually connecting nodes: ${nodeAId} <-> ${nodeBId}`);
    if (!nodeA.connections.includes(nodeBId)) nodeA.connections.push(nodeBId);
    if (!nodeB.connections.includes(nodeAId)) nodeB.connections.push(nodeAId);
    saveMentalData(data);
    notifySubscribers();
  } else {
    logger.warn(`Failed to connect nodes: one or both IDs not found (${nodeAId}, ${nodeBId})`);
  }
}

export function addThought(
  title: string,
  content: string,
  type: ThoughtType,
  parentId?: string,
  relatedIds: string[] = [],
  embedding?: number[],
  tags: string[] = [],
  images: string[] = []
): ThoughtNode {
  logger.info(`Adding new thought: ${title} (${type})`);
  const data = getMentalData();
  const now = Date.now();
  
  // Find automatic semantic connections based on text similarity
  const autoConnections: string[] = [];
  data.nodes.forEach(existingNode => {
    if (calculateSimilarity(title, content, existingNode.title, existingNode.content)) {
      autoConnections.push(existingNode.id);
    }
  });

  if (autoConnections.length > 0) {
    logger.info(`Auto-detected ${autoConnections.length} semantic connections for new node.`);
  }

  const newNode: ThoughtNode = {
    id: Math.random().toString(36).substring(2, 11),
    title,
    content,
    type,
    createdAt: now,
    updatedAt: now,
    importance: 0.5,
    confidence: 0.5,
    score: 0, // Will be computed
    embedding,
    parentId,
    links: relatedIds.filter(id => data.nodes.some(n => n.id === id)), // Only links to existing nodes
    connections: autoConnections,
    tags: tags,
    images: images
  };

  // Re-calculate scores for all nodes including the new one
  data.nodes.push(newNode);
  
  // Bidirectional connections update for auto-detected ties
  autoConnections.forEach(targetId => {
    const targetNode = data.nodes.find(n => n.id === targetId);
    if (targetNode && !targetNode.connections.includes(newNode.id)) {
      targetNode.connections.push(newNode.id);
    }
  });
  
  const timestamps = data.nodes.map(n => Math.max(n.createdAt || 0, n.updatedAt || 0));
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  
  data.nodes = data.nodes.map(n => ({
    ...n,
    score: computeNodeScore(n, minTs, maxTs)
  }));
  
  if (parentId && data.nodes.some(n => n.id === parentId)) {
    data.links.push({ source: parentId, target: newNode.id });
  }

  newNode.links.forEach(targetId => {
    if (targetId !== parentId) {
      data.links.push({ source: newNode.id, target: targetId });
    }
  });

  saveMentalData(data);
  notifySubscribers();
  return newNode;
}

export function getLineage(nodeId: string): ThoughtNode[] {
  const data = getMentalData();
  const lineage: ThoughtNode[] = [];
  const visited = new Set<string>();

  function traverse(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = data.nodes.find(n => n.id === id);
    if (node) {
      lineage.push(node);
      // Find all children or related nodes
      data.nodes.filter(n => n.parentId === id).forEach(child => traverse(child.id));
      // Also check if this node refers to others in its 'links'
      node.links.forEach(linkId => traverse(linkId));
    }
  }

  traverse(nodeId);
  return lineage;
}

export function getRootNodes(): ThoughtNode[] {
  const data = getMentalData();
  return data.nodes.filter(node => !node.parentId);
}

export function getRelevantNodes(
  allNodes: ThoughtNode[], 
  focusedNodeId?: string | null,
  searchEmbedding?: number[]
): any[] {
  logger.info(`Fetching relevant nodes. Focus: ${focusedNodeId || 'none'}, Search: ${searchEmbedding ? 'active' : 'inactive'}`);
  // 1. Get nodes by score
  const nodesByScore = [...allNodes].sort((a, b) => b.score - a.score).slice(0, 10);
  
  // 2. Get nodes by recency (updatedAt)
  const nodesByRecency = [...allNodes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  
  // 3. Get connected nodes (direct parent, children, and links)
  let connectedNodes: ThoughtNode[] = [];
  let semanticNodes: ThoughtNode[] = [];

  if (focusedNodeId) {
    const focus = allNodes.find(n => n.id === focusedNodeId);
    if (focus) {
      const connectedIds = new Set<string>([
        ...(focus.parentId ? [focus.parentId] : []),
        ...focus.links,
        ...focus.connections,
        ...allNodes.filter(n => n.parentId === focus.id).map(n => n.id)
      ]);
      connectedNodes = allNodes.filter(n => connectedIds.has(n.id));

      // Semantic search based on focus node
      if (focus.embedding) {
        semanticNodes = findSimilarNodes(focus.embedding, allNodes.filter(n => n.id !== focus.id), 5);
      }
    }
  }

  // 4. NEW: Semantic search based on user query embedding (explicit search)
  if (searchEmbedding && searchEmbedding.length > 0) {
    const searchMatches = findSimilarNodes(searchEmbedding, allNodes, 8);
    semanticNodes = [...semanticNodes, ...searchMatches];
  }

  // Combine and remove duplicates
  const selectedMap = new Map<string, ThoughtNode>();
  [...nodesByScore, ...nodesByRecency, ...connectedNodes, ...semanticNodes].forEach(n => {
    selectedMap.set(n.id, n);
  });

  // Sort final set by score DESC
  const finalNodes = Array.from(selectedMap.values()).sort((a, b) => b.score - a.score);

  // Return only safe/necessary fields for the AI context
  return finalNodes.map(n => ({
    title: n.title,
    content: n.content,
    type: n.type,
    tags: n.tags
  }));
}

export function analyzeMemory(nodes: ThoughtNode[]): MemoryAnalysis {
  logger.info(`Analyzing memory state for ${nodes.length} nodes.`);
  
  const counts = {
    fato: nodes.filter(n => n.type === 'fato').length,
    hipotese: nodes.filter(n => n.type === 'hipotese').length,
    projeto: nodes.filter(n => n.type === 'projeto').length,
    duvida: nodes.filter(n => n.type === 'duvida').length,
    others: nodes.filter(n => !['fato', 'hipotese', 'projeto', 'duvida'].includes(n.type)).length
  };

  // Data Quality Classification
  const quality = {
    valid: 0,
    shallow: 0,
    noise: 0
  };

  nodes.forEach(n => {
    const text = (n.title + ' ' + n.content).trim();
    const titleLen = n.title.trim().length;
    const contentLen = n.content.trim().length;

    // Noise detection (Rule 3)
    const isGibberish = /(.)\1{4,}/.test(text) || /(bcdfghjklmnpqrstvwxyz){5,}/i.test(text);
    const tooShort = text.length < 10;
    const vowels = text.match(/[aeiouáéíóúâêôãõ]/gi) || [];
    const lowSemanticValue = vowels.length < text.length * 0.1 && text.length > 0;

    if (tooShort || isGibberish || lowSemanticValue) {
      quality.noise++;
    } 
    // Shallow detection (Rule 4)
    else if (titleLen > 0 && contentLen < 30) {
      quality.shallow++;
    } 
    // Valid detection (Rule 5)
    else {
      quality.valid++;
    }
  });

  const noisePercentage = nodes.length > 0 ? (quality.noise / nodes.length) * 100 : 0;

  const insights: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Análise de padrões
  if (noisePercentage > 50) {
    warnings.push("ALERTA CRÍTICO: Mais de 50% dos dados são considerados ruído (baixo valor semântico).");
    suggestions.push("Aprofunde o conteúdo dos nós existentes antes de prosseguir com análises neurais.");
  }

  if (counts.hipotese > counts.fato * 2 && counts.fato > 0) {
    warnings.push("Desequilíbrio detectado: alta densidade de hipóteses para poucos fatos.");
    suggestions.push("Considere validar suas hipóteses atuais antes de gerar novas expansões teóricas.");
  }

  if (counts.duvida > 3) {
    insights.push(`Existem ${counts.duvida} lacunas de conhecimento (dúvidas) aguardando processamento.`);
  }

  const isolatedNodes = nodes.filter(n => !n.parentId && n.links.length === 0 && n.connections.length === 0 && n.id !== 'root');
  if (isolatedNodes.length > 0) {
    warnings.push(`${isolatedNodes.length} fragmentos de memória estão sem âncoras contextuais (isolados).`);
    suggestions.push("Utilize a ferramenta de conexões para integrar nós isolados à malha principal.");
  }

  // Detecção de redundância simples
  const similarCount = nodes.filter(n => n.connections.length > 5).length;
  if (similarCount > 0) {
    insights.push("Você possui núcleos de pensamento altamente densos (hubs semânticos).");
  }

  return {
    summary: `Estado da Malha: ${nodes.length} nós ativos (${counts.fato}F | ${counts.hipotese}H | ${counts.projeto}P | ${counts.duvida}D).`,
    insights,
    warnings,
    suggestions,
    qualityReport: {
      ...quality,
      noisePercentage
    }
  };
}

export function deleteMultipleNodes(nodeIds: string[]): void {
  const data = getMentalData();
  const idsToDelete = new Set(nodeIds);
  
  logger.info(`Bulk deleting ${nodeIds.length} nodes.`);

  // 1. Filter out the nodes
  data.nodes = data.nodes.filter(n => !idsToDelete.has(n.id));
  
  // 2. Clear broken connections and links
  data.nodes.forEach(node => {
    node.links = node.links.filter(id => !idsToDelete.has(id));
    node.connections = node.connections.filter(id => !idsToDelete.has(id));
    if (node.parentId && idsToDelete.has(node.parentId)) {
      node.parentId = undefined;
    }
  });

  // 3. Clear broken links in links array
  data.links = data.links.filter(l => !idsToDelete.has(l.source) && !idsToDelete.has(l.target));

  saveMentalData(data);
  notifySubscribers();
}

export function resetMemory(): void {
  logger.warn("FULL MEMORY RESET INITIATED.");
  saveMentalData({ ...DEFAULT_DATA });
  notifySubscribers();
}

export function getNodeQuality(node: ThoughtNode): 'valid' | 'shallow' | 'noise' {
  const text = (node.title + ' ' + node.content).trim();
  const titleLen = node.title.trim().length;
  const contentLen = node.content.trim().length;

  const isGibberish = /(.)\1{4,}/.test(text) || /(bcdfghjklmnpqrstvwxyz){5,}/i.test(text);
  const tooShort = text.length < 10;
  const vowels = text.match(/[aeiouáéíóúâêôãõ]/gi) || [];
  const lowSemanticValue = vowels.length < text.length * 0.1 && text.length > 0;

  if (tooShort || isGibberish || lowSemanticValue) return 'noise';
  if (titleLen > 0 && contentLen < 30) return 'shallow';
  return 'valid';
}

export function createExampleLongevityProject(): ThoughtNode {
  logger.info("Generating Transhumanism Example Project...");
  
  // 1. Root Node
  const root = addThought(
    "Projeto: Transumanismo e Genética Evolutiva",
    "Estudo central sobre a modificação do genoma humano para alcançar a imortalidade biológica e a perfeição física/cognitiva através de intervenções exógenas.",
    "projeto",
    undefined,
    [],
    undefined,
    ["transumanismo", "genética", "evolução"]
  );

  // 2. Longevity Branch
  const longevity = addThought(
    "Sequência Neural: Longevidade e Anti-envelhecimento",
    "Pesquisa sobre a interrupção da senescência celular. Foco em manter o organismo em estado de homeostase perpétua.",
    "sequencia",
    root.id,
    [],
    undefined,
    ["longevidade", "imortalidade"],
    ["https://images.unsplash.com/photo-1544396821-4dd40b938ad3?q=80&w=2073&auto=format&fit=crop", "https://images.unsplash.com/photo-1532187875605-1ef6382391d3?q=80&w=2070&auto=format&fit=crop"]
  );

  addThought(
    "Mecânica dos Telômeros",
    "Estudo sobre a ativação controlada da telomerase para evitar o encurtamento dos cromossomos durante a divisão celular, eliminando o limite de Hayflick.",
    "fato",
    longevity.id,
    [],
    undefined,
    ["biologia", "celular"],
    ["https://images.unsplash.com/photo-1530210124550-912dc1381cb8?q=80&w=2070&auto=format&fit=crop"]
  );

  addThought(
    "Produtos Manipulados: O Fator de Regeneração",
    "Desenvolvimento de compostos químicos capazes de realizar o reparo automático de fitas duplas de DNA danificadas por estresse oxidativo.",
    "ideia",
    longevity.id,
    [],
    undefined,
    ["farmacologia", "química"]
  );

  // 3. Perfect Human Branch
  const perfectHuman = addThought(
    "Sequência Neural: O Ser Humano Perfeito",
    "Abordagem sobre a criação de uma nova linhagem humana com capacidades otimizadas (força, inteligência, imunidade total).",
    "sequencia",
    root.id,
    [],
    undefined,
    ["eugenia-positiva", "bioengenharia"]
  );

  addThought(
    "Modificação Pós-Natal: Substâncias de Injeção",
    "Uso de vetores virais (CRISPR-Cas9 avançado) administrados via injeção para reescrever o código genético em tecidos vivos de crianças em fase de crescimento.",
    "hipotese",
    perfectHuman.id,
    [],
    undefined,
    ["crispr", "terapia-gênica"]
  );

  addThought(
    "Ingestão Sistemática: Soro da Perfeição",
    "Substância líquida para ingestão periódica que interage com a microbiota para sinalizar mudanças epigenéticas permanentes em órgãos vitais.",
    "ideia",
    perfectHuman.id,
    [],
    undefined,
    ["biotech", "soro"]
  );

  logger.info("Example Project Created Successfully.");
  return root;
}

export function updateThought(
  nodeId: string,
  updates: Partial<Pick<
    ThoughtNode,
    'title' | 'content' | 'type' | 'images' | 'tags' | 'source' | 'period' | 'temporalidade' | 'factualConfidence' | 'hypothesisConfidence' | 'evidenceConfidence' | 'origemCognitiva' | 'origemInferencia' | 'contradiz' | 'hypotheses' | 'evidences'
  >>
): void {
  logger.info(`Updating thought: ${nodeId}`);
  const data = getMentalData();
  const nodeIndex = data.nodes.findIndex(n => n.id === nodeId);
  
  if (nodeIndex === -1) {
    logger.warn(`Node ${nodeId} not found for update`);
    return;
  }

  const node = data.nodes[nodeIndex];
  data.nodes[nodeIndex] = {
    ...node,
    ...updates,
    updatedAt: Date.now()
  };

  saveMentalData(data);
  notifySubscribers();
}

export function deleteThought(nodeId: string): void {
  console.log('MindCore: Attempting to delete node', nodeId);
  const data = getMentalData();
  
  // Find the node being deleted to get its parent
  const nodeToDelete = data.nodes.find(n => n.id === nodeId);
  const parentId = nodeToDelete?.parentId;

  // 1. Filter out the node
  data.nodes = data.nodes.filter(n => n.id !== nodeId);
  
  // 2. Reconnect children: any node that had 'nodeId' as parent now gets 'parentId'
  data.nodes = data.nodes.map(n => {
    let updated = { ...n };
    let changed = false;

    if (n.parentId === nodeId) {
      updated.parentId = parentId;
      changed = true;
    }

    if (n.links.includes(nodeId)) {
      updated.links = n.links.filter(id => id !== nodeId);
      // If we have a parentId, we could optionally link to it, 
      // but parentId strictly handles the hierarchy
      changed = true;
    }

    if (n.connections.includes(nodeId)) {
      updated.connections = n.connections.filter(id => id !== nodeId);
      changed = true;
    }

    return changed ? updated : n;
  });

  // 3. Update links array (for the graph visualization)
  // Remove links involving the deleted node
  const oldLinks = data.links.filter(l => l.source === nodeId || l.target === nodeId);
  data.links = data.links.filter(l => l.source !== nodeId && l.target !== nodeId);

  // If there's a parent, reconnect orphaned children in the links array
  if (parentId) {
    oldLinks.forEach(link => {
      // If the link was nodeToDelete -> Child, create parentId -> Child
      if (link.source === nodeId && link.target !== parentId) {
        // Prevent duplicate links
        if (!data.links.some(l => l.source === parentId && l.target === link.target)) {
          data.links.push({ source: parentId, target: link.target });
        }
      }
      // If the link was Parent -> nodeToDelete (already handled by the filter)
    });
  }
  
  saveMentalData(data);
  notifySubscribers();
}
