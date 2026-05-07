import { GoogleGenAI } from "@google/genai";
import { ThoughtNode, MemoryAnalysis } from "../types";

const geminiApiKey = (
  process.env.GEMINI_API_KEY ||
  process.env.VITE_GEMINI_API_KEY ||
  ""
).trim();
const hasGeminiApiKey = geminiApiKey.length > 0;
const ai = hasGeminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const MISSING_KEY_MESSAGE =
  "A IA está sem configuração de chave. Defina GEMINI_API_KEY (ou VITE_GEMINI_API_KEY) no ambiente para habilitar busca e síntese.";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function askMindArchitect(
  query: string, 
  thoughts: any[], 
  analysis: MemoryAnalysis,
  history: ChatMessage[] = []
): Promise<string> {
  if (!ai) {
    return MISSING_KEY_MESSAGE;
  }

  try {
    const prompt = `
      Você é o RAFAEL, um sistema de memória estruturada. Sua função é ajudar o usuário a organizar e navegar em seus próprios pensamentos registrados.

      DIRETRIZES DE INTENÇÃO E RESPOSTA:
      1. IDENTIFIQUE A INTENÇÃO:
         - Pergunta simples/conceitual (ex: "o que é isso?", "quem é você?"): Responda de forma direta, CURTA e amigável. Sem relatórios técnicos.
         - Pedido de análise (ex: "analise minha memória", "quais padrões?"): Use o diagnóstico da malha e forneça um relatório estruturado.
         - Pedido técnico: Explique a lógica por trás do sistema.

      2. REGRAS DE ESTILO:
         - PROIBIDO começar respostas com "Varredura iniciada", "Cortex-LS" ou "Diagnóstico da Malha" a menos que seja uma análise solicitada.
         - Use linguagem natural. Só use termos como "embeddings" ou "vetores" se o usuário estiver perguntando sobre a tecnologia.
         - Se houver pouco ou nenhum dado real, diga honestamente: "Ainda não tenho dados suficientes registrados para essa análise. Comece adicionando pensamentos ou projetos."

      3. CONTEXTO DISPONÍVEL (Use apenas se necessário para a intenção):
         - Resumo da Malha: ${analysis.summary}
         - Qualidade dos Dados: Válidos: ${analysis.qualityReport?.valid}, Ruído: ${analysis.qualityReport?.noise}
         - Fragmentos de Memória: ${JSON.stringify(thoughts, null, 2)}

      PERGUNTA DO USUÁRIO: "${query}"
    `;

    const contents = [
      ...history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      })),
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents as any
    });
    
    return response.text || "Varredura completa. Nenhuma anomalia interpretável detectada.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Varredura interrompida. Erro de integridade nos setores de memória.";
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!ai) return [];

  try {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: [text]
    });
    return result.embeddings[0].values;
  } catch (error) {
    console.error("Embedding Error (gemini-embedding-2-preview):", error);
    return [];
  }
}
