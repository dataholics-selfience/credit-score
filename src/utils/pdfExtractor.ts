/**
 * Utilitário para extração de dados de PDFs usando pdfplumber
 */

interface ExtractedPDFData {
  text: string;
  tables: any[];
  metadata: {
    pages: number;
    extractedAt: string;
    fileSize: number;
    fileName: string;
  };
  structuredData: {
    financialData?: {
      receita?: string;
      lucro?: string;
      despesas?: string;
      patrimonio?: string;
    };
    companyInfo?: {
      cnpj?: string;
      razaoSocial?: string;
      periodo?: string;
    };
    balanceSheet?: any[];
    incomeStatement?: any[];
  };
}

/**
 * Extrai dados estruturados de um PDF de demonstrativo financeiro
 */
export async function extractPDFData(file: File): Promise<ExtractedPDFData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Simular extração de dados (em produção, seria feita no backend)
        const extractedData: ExtractedPDFData = {
          text: await extractTextFromPDF(uint8Array),
          tables: await extractTablesFromPDF(uint8Array),
          metadata: {
            pages: await getPageCount(uint8Array),
            extractedAt: new Date().toISOString(),
            fileSize: file.size,
            fileName: file.name
          },
          structuredData: await structureFinancialData(uint8Array)
        };
        
        resolve(extractedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo PDF'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Extrai texto do PDF (simulação - em produção seria no backend)
 */
async function extractTextFromPDF(data: Uint8Array): Promise<string> {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Retornar texto simulado baseado em demonstrativos reais
  return `
DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO
PERÍODO: 01/01/2023 A 31/12/2023

RECEITA OPERACIONAL BRUTA: R$ 2.500.000,00
(-) DEDUÇÕES DA RECEITA: R$ 350.000,00
RECEITA OPERACIONAL LÍQUIDA: R$ 2.150.000,00

CUSTOS DOS PRODUTOS VENDIDOS: R$ 1.200.000,00
LUCRO BRUTO: R$ 950.000,00

DESPESAS OPERACIONAIS:
- Despesas Administrativas: R$ 180.000,00
- Despesas Comerciais: R$ 120.000,00
- Despesas Financeiras: R$ 50.000,00
TOTAL DESPESAS OPERACIONAIS: R$ 350.000,00

LUCRO OPERACIONAL: R$ 600.000,00
LUCRO LÍQUIDO: R$ 450.000,00

BALANÇO PATRIMONIAL
ATIVO TOTAL: R$ 1.800.000,00
PASSIVO TOTAL: R$ 1.200.000,00
PATRIMÔNIO LÍQUIDO: R$ 600.000,00
  `;
}

/**
 * Extrai tabelas do PDF (simulação)
 */
async function extractTablesFromPDF(data: Uint8Array): Promise<any[]> {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return [
    {
      type: 'income_statement',
      data: [
        ['Descrição', 'Valor (R$)'],
        ['Receita Operacional Bruta', '2.500.000,00'],
        ['Deduções da Receita', '350.000,00'],
        ['Receita Operacional Líquida', '2.150.000,00'],
        ['Custos dos Produtos Vendidos', '1.200.000,00'],
        ['Lucro Bruto', '950.000,00'],
        ['Despesas Operacionais', '350.000,00'],
        ['Lucro Líquido', '450.000,00']
      ]
    },
    {
      type: 'balance_sheet',
      data: [
        ['Conta', 'Valor (R$)'],
        ['Ativo Circulante', '800.000,00'],
        ['Ativo Não Circulante', '1.000.000,00'],
        ['Ativo Total', '1.800.000,00'],
        ['Passivo Circulante', '400.000,00'],
        ['Passivo Não Circulante', '800.000,00'],
        ['Patrimônio Líquido', '600.000,00']
      ]
    }
  ];
}

/**
 * Conta páginas do PDF (simulação)
 */
async function getPageCount(data: Uint8Array): Promise<number> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return Math.floor(Math.random() * 5) + 1; // 1-5 páginas
}

/**
 * Estrutura dados financeiros extraídos
 */
async function structureFinancialData(data: Uint8Array): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  return {
    financialData: {
      receita: 'R$ 2.150.000,00',
      lucro: 'R$ 450.000,00',
      despesas: 'R$ 350.000,00',
      patrimonio: 'R$ 600.000,00'
    },
    companyInfo: {
      periodo: '01/01/2023 a 31/12/2023',
      tipoRelatorio: 'Demonstração do Resultado do Exercício'
    },
    balanceSheet: [
      { conta: 'Ativo Total', valor: 1800000 },
      { conta: 'Passivo Total', valor: 1200000 },
      { conta: 'Patrimônio Líquido', valor: 600000 }
    ],
    incomeStatement: [
      { conta: 'Receita Operacional Líquida', valor: 2150000 },
      { conta: 'Lucro Bruto', valor: 950000 },
      { conta: 'Lucro Líquido', valor: 450000 }
    ]
  };
}

/**
 * Valida se o PDF contém dados financeiros válidos
 */
export function validateFinancialPDF(extractedData: ExtractedPDFData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verificar se há texto extraído
  if (!extractedData.text || extractedData.text.trim().length < 100) {
    errors.push('PDF não contém texto suficiente para análise');
  }
  
  // Verificar se há dados financeiros estruturados
  if (!extractedData.structuredData.financialData) {
    warnings.push('Dados financeiros não foram identificados automaticamente');
  }
  
  // Verificar se há tabelas
  if (!extractedData.tables || extractedData.tables.length === 0) {
    warnings.push('Nenhuma tabela foi identificada no documento');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Formata dados extraídos para envio ao webhook
 */
export function formatExtractedDataForWebhook(extractedData: ExtractedPDFData) {
  return {
    extractedText: extractedData.text,
    structuredData: extractedData.structuredData,
    tables: extractedData.tables,
    metadata: extractedData.metadata,
    validation: validateFinancialPDF(extractedData)
  };
}