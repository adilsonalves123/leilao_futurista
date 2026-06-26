export interface ItemCompliance {
    weightKg: number;
    dimensions: { lengthCm: number; widthCm: number; heightCm: number };
    nfKey?: string; // Chave de 44 dígitos
    nfPdfUrl?: string; // Ou o arquivo PDF
  }
  
  export class ComplianceService {
    /**
     * Valida se o item possui os requisitos mínimos de fiscalização e frete
     */
    public static validateItemRegistration(compliance: ItemCompliance): { valid: boolean; error?: string } {
      // 1. Validação de Peso e Dimensões (para cálculo de frete posterior)
      if (!compliance.weightKg || compliance.weightKg <= 0) {
        return { valid: false, error: "O peso do item é obrigatório e deve ser maior que zero." };
      }
      
      const { lengthCm, widthCm, heightCm } = compliance.dimensions || {};
      if (!lengthCm || !widthCm || !heightCm || lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
        return { valid: false, error: "Todas as dimensões (C x L x A) devem ser preenchidas para o cálculo do frete." };
      }
  
      // 2. Validação Estrita de Nota Fiscal (Segurança do Leilão)
      const hasValidKey = compliance.nfKey && compliance.nfKey.trim().length === 44 && /^\d+$/.test(compliance.nfKey);
      const hasPdf = compliance.nfPdfUrl && compliance.nfPdfUrl.trim().length > 0;
  
      if (!hasValidKey && !hasPdf) {
        return { valid: false, error: "Compliance Fiscal Rejeitado: Insira a Chave de Acesso da NF (44 dígitos) ou faça o upload do PDF." };
      }
  
      return { valid: true };
    }
  }
  