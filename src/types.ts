/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThoughtType = 'thought' | 'emotion' | 'discovery' | 'project' | 'milestone' | 'fato' | 'hipotese' | 'projeto' | 'duvida' | 'ideia' | 'sequencia';

export type GraphViewMode = 'neural' | 'radial' | 'hierarchical' | 'flow' | 'synapse';

export interface ThoughtNode {
  id: string;
  slug?: string;
  title: string;
  content: string;
  type: ThoughtType;
  createdAt: number;
  updatedAt: number;
  importance: number;
  confidence: number;
  score: number;
  embedding?: number[];
  parentId?: string; // Original parent
  links: string[];   // Multiple references
  connections: string[]; // New semantic connections
  tags: string[];
  images?: string[];
  source?: string;
  period?: string;
  temporalidade?: {
    inicio?: string | null;
    fim?: string | null;
    precisao?: string;
    textoOriginal?: string | null;
  };
  factualConfidence?: number;
  hypothesisConfidence?: number;
  evidenceConfidence?: number;
  origemCognitiva?: 'humana' | 'ia' | 'mista' | string;
  origemInferencia?: 'LLM' | 'heuristica' | 'manual' | string;
  contradiz?: string[];
  hypotheses?: string[];
  evidences?: string[];
}

export interface ThoughtLink {
  source: string;
  target: string;
  label?: string;
}

export interface MentalArchitecture {
  version: number;
  nodes: ThoughtNode[];
  links: ThoughtLink[];
}

export interface MemoryAnalysis {
  summary: string;
  insights: string[];
  warnings: string[];
  suggestions: string[];
  qualityReport?: {
    valid: number;
    shallow: number;
    noise: number;
    noisePercentage: number;
  };
}
