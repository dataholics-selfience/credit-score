import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  MapPin,
  User,
  DollarSign,
  PieChart,
  BarChart3,
  Shield,
  AlertTriangle,
  Info,
  Download,
  Eye,
  Target,
  Calculator,
  CreditCard
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';

interface WebhookCreditAnalysisResponse {
  empresa: {
    razao_social: string;
    cnpj: string;
    porte: string;
    estado: string;
    municipio: string;
    atividade_principal: string;
    situacao_cadastral: string;
    data_abertura: string;
    socio_administrador: string;
  };
  score_credito: {
    valor: number;
    classificacao: string;
    motivo: string;
  };
  condicoes_pagamento: {
    valor_total_financiado: string;
    entrada_sugerida: string;
    numero_parcelas: number;
    valor_parcela: string;
  };
  simulacao_financiamento: {
    taxa_juros_mensal: string;
    valor_total_pago: string;
    lucro_liquido_estimado_operacao: string;
  };
  analise_empresa: {
    financeiro: {
      receita_anual_estimada: string;
      lucro_liquido_estimado_anual: string;
      lucro_mensal_estimado: string;
      divida_bancaria_total: string;
      percentual_divida_sobre_receita: string;
      percentual_parcela_sobre_lucro: string;
    };
    operacional: {
      obras_entregues_ultimo_ano: number;
      tipo_principal_de_obra: string;
      regiao_de_atuacao: string;
    };
    analise_interpretativa: string;
    recomendacoes: string[];
  };
  dados_detalhados?: any;
}

interface CreditAnalysis {
  score: number;
  classificacao: string;
  motivo: string;
  entrada_sugerida: string;
  numero_parcelas: number;
  valor_parcela: string;
  juros_mensal: string;
  valor_total_financiado?: string;
  valor_total_pago?: string;
  lucro_liquido_estimado_operacao?: string;
  recomendacao_final?: string;
  indicadores_cadastrais: {
    razao_social: string;
    cnpj: string;
    situacao_cadastral: string;
    capital_social: string;
    data_abertura: string;
    porte: string;
    atividade_principal: string;
    socio_administrador: string;
    estado: string;
    municipio: string;
  };
  indicadores_financeiros: {
    receita_anual_estimativa: string;
    lucro_liquido_estimado: string;
    divida_bancaria_estimativa: string;
    percentual_divida_sobre_receita?: string;
    lucro_mensal_estimado?: string;
    valor_parcela_calculada?: string;
    percentual_parcela_sobre_lucro?: string;
  };
  indicadores_operacionais: {
    obras_entregues_ultimo_ano: number;
    tipo_principal_de_obra: string;
    regiao_de_atuacao: string;
  };
  analise_interpretativa?: string;
  recomendacoes?: string[];
  dados_detalhados?: {
    capital_social: string;
    situacao_cadastral: string;
    data_abertura: string;
    cnpj: string;
    atividade_principal: string;
    socio_administrador: string;
    estado: string;
    municipio: string;
    receita_estimada: string;
    lucro_estimado: string;
    divida_total: string;
    obras_entregues: number;
    regiao_atuacao: string;
    porte: string;
  };
}

const ScoreGauge = ({ score, classification }: { score: number; classification: string }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { color: '#10B981', bg: 'from-green-500 to-emerald-500', text: 'Excelente' };
    if (score >= 60) return { color: '#F59E0B', bg: 'from-yellow-500 to-orange-500', text: 'Bom' };
    if (score >= 40) return { color: '#EF4444', bg: 'from-orange-500 to-red-500', text: 'Regular' };
    return { color: '#DC2626', bg: 'from-red-600 to-red-700', text: 'Ruim' };
  };

  const { color, bg } = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-56 h-56 mx-auto">
      <svg className="w-56 h-56 transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke={color}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold text-white mb-2">{score}</div>
        <div className={`text-lg font-medium px-4 py-2 rounded-full bg-gradient-to-r ${bg} text-white`}>
          {classification}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  trend, 
  color = "blue",
  size = "normal"
}: {
  icon: any;
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  size?: 'normal' | 'large';
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-orange-500',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={16} className="text-green-400" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-red-400" />;
    return null;
  };

  const cardSize = size === 'large' ? 'p-8' : 'p-6';
  const iconSize = size === 'large' ? 32 : 24;
  const titleSize = size === 'large' ? 'text-lg' : 'text-sm';
  const valueSize = size === 'large' ? 'text-4xl' : 'text-2xl';

  return (
    <div className={`bg-gray-800 rounded-xl ${cardSize} border border-gray-700 hover:border-gray-600 transition-colors`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon size={iconSize} className="text-white" />
        </div>
        {getTrendIcon()}
      </div>
      <h3 className={`text-gray-400 ${titleSize} font-medium mb-1`}>{title}</h3>
      <p className={`${valueSize} font-bold text-white mb-1`}>{value}</p>
      {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
    </div>
  );
};

const RiskIndicator = ({ level, description }: { level: 'low' | 'medium' | 'high'; description: string }) => {
  const configs = {
    low: { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-600', icon: Shield, label: 'Risco Baixo' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-600', icon: AlertTriangle, label: 'Risco Médio' },
    high: { color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-600', icon: AlertCircle, label: 'Risco Alto' }
  };

  const config = configs[level];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-6`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon size={24} className={config.color} />
        <span className={`font-bold text-lg ${config.color}`}>
          {config.label}
        </span>
      </div>
      <p className="text-gray-300 leading-relaxed">{description}</p>
    </div>
  );
};

const PaymentSimulation = ({ result }: { result: CreditAnalysis }) => {
  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-8 border border-blue-600/30">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <Calculator className="text-blue-400" />
        Simulação de Financiamento
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="text-center bg-white/5 rounded-lg p-6">
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {result.valor_total_financiado || 'N/A'}
          </div>
          <div className="text-gray-400">Valor Financiado</div>
        </div>
        <div className="text-center bg-white/5 rounded-lg p-6">
          <div className="text-3xl font-bold text-green-400 mb-2">
            {result.entrada_sugerida}
          </div>
          <div className="text-gray-400">Entrada Sugerida</div>
        </div>
        <div className="text-center bg-white/5 rounded-lg p-6">
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {result.numero_parcelas}x
          </div>
          <div className="text-gray-400">Parcelas</div>
        </div>
        <div className="text-center bg-white/5 rounded-lg p-6">
          <div className="text-3xl font-bold text-purple-400 mb-2">
            {result.valor_parcela}
          </div>
          <div className="text-gray-400">Valor da Parcela</div>
        </div>
        <div className="text-center bg-white/5 rounded-lg p-6">
          <div className="text-3xl font-bold text-orange-400 mb-2">
            {result.juros_mensal}
          </div>
          <div className="text-gray-400">Taxa Mensal</div>
        </div>
      </div>

      {/* Resumo Financeiro da Simulação */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h4 className="text-lg font-bold text-white mb-4">Resumo da Operação</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Valor Total Pago</div>
            <div className="text-2xl font-bold text-purple-400">
              {result.valor_total_pago || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Lucro da Operação</div>
            <div className="text-2xl font-bold text-green-400">
              {result.lucro_liquido_estimado_operacao || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Comprometimento do Lucro</div>
            <div className="text-2xl font-bold text-yellow-400">
              {result.indicadores_financeiros.percentual_parcela_sobre_lucro || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatCurrency = (value: string) => {
  return value.replace('R$', '').trim();
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

const getCompanyAge = (dateString: string) => {
  const foundedDate = new Date(dateString);
  const now = new Date();
  const years = now.getFullYear() - foundedDate.getFullYear();
  return `${years} anos`;
};

const CashFlowChart = ({ result }: { result: CreditAnalysis }) => {
  // Extract numerical values for calculations
  const extractNumber = (value: string): number => {
    const cleanValue = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const receita = extractNumber(result.indicadores_financeiros.receita_anual_estimativa);
  const lucro = extractNumber(result.indicadores_financeiros.lucro_liquido_estimado);
  const divida = extractNumber(result.indicadores_financeiros.divida_bancaria_estimativa);
  const valorParcela = extractNumber(result.valor_parcela);
  const parcelaAnual = valorParcela * 12;

  // Calculate health indicators
  const margemLucro = receita > 0 ? (lucro / receita) * 100 : 0;
  const endividamento = receita > 0 ? (divida / receita) * 100 : 0;
  const comprometimentoCredito = lucro > 0 ? (parcelaAnual / lucro) * 100 : 0;

  // Determine overall health
  const getHealthStatus = () => {
    if (margemLucro > 15 && endividamento < 30 && comprometimentoCredito < 40) {
      return { status: 'Excelente', color: 'text-green-400', bgColor: 'bg-green-500', percentage: 85 };
    } else if (margemLucro > 10 && endividamento < 50 && comprometimentoCredito < 60) {
      return { status: 'Boa', color: 'text-blue-400', bgColor: 'bg-blue-500', percentage: 70 };
    } else if (margemLucro > 5 && endividamento < 70 && comprometimentoCredito < 80) {
      return { status: 'Regular', color: 'text-yellow-400', bgColor: 'bg-yellow-500', percentage: 50 };
    } else {
      return { status: 'Crítica', color: 'text-red-400', bgColor: 'bg-red-500', percentage: 25 };
    }
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-8 border border-gray-700">
      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <PieChart className="text-blue-400" />
        Análise de Fluxo de Caixa
      </h3>
      
      {/* Health Status Indicator */}
      <div className="text-center mb-8">
        <div className="relative w-48 h-48 mx-auto mb-4">
          <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthStatus.percentage / 100)}`}
              strokeLinecap="round"
              className={`transition-all duration-1000 ease-out ${healthStatus.color}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-4xl font-bold ${healthStatus.color} mb-2`}>
              {healthStatus.percentage}%
            </div>
            <div className={`text-lg font-medium px-4 py-2 rounded-full ${healthStatus.bgColor} text-white`}>
              {healthStatus.status}
            </div>
          </div>
        </div>
        <p className="text-gray-300 text-lg">Saúde Financeira para Crédito</p>
      </div>

      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">
            {margemLucro.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm">Margem de Lucro</div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(margemLucro * 2, 100)}%` }}
            />
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-yellow-400 mb-2">
            {endividamento.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm">Endividamento</div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(endividamento, 100)}%` }}
            />
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-red-400 mb-2">
            {comprometimentoCredito.toFixed(1)}%
          </div>
          <div className="text-gray-400 text-sm">Comprometimento</div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(comprometimentoCredito, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Cash Flow Visualization */}
      <div className="bg-gray-800/30 rounded-lg p-6">
        <h4 className="text-lg font-bold text-white mb-4">Fluxo de Caixa Projetado (Anual)</h4>
        <div className="space-y-4">
          {/* Revenue Bar */}
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-gray-400">Receita</div>
            <div className="flex-1 bg-gray-700 rounded-full h-8 relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-4"
                style={{ width: '100%' }}
              >
                <span className="text-white font-bold text-sm">
                  {result.indicadores_financeiros.receita_anual_estimativa}
                </span>
              </div>
            </div>
          </div>

          {/* Debt Bar */}
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-gray-400">Dívidas</div>
            <div className="flex-1 bg-gray-700 rounded-full h-6 relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-400 h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-4"
                style={{ width: `${Math.min(endividamento, 100)}%` }}
              >
                <span className="text-white font-bold text-xs">
                  {result.indicadores_financeiros.divida_bancaria_estimativa}
                </span>
              </div>
            </div>
          </div>

          {/* New Credit Bar */}
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-gray-400">Novo Crédito</div>
            <div className="flex-1 bg-gray-700 rounded-full h-6 relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-400 h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-4"
                style={{ width: `${Math.min(comprometimentoCredito, 100)}%` }}
              >
                <span className="text-white font-bold text-xs">
                  {formatCurrency(parcelaAnual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}
                </span>
              </div>
            </div>
          </div>

          {/* Net Profit Bar */}
          <div className="flex items-center gap-4">
            <div className="w-24 text-sm text-gray-400">Lucro Líq.</div>
            <div className="flex-1 bg-gray-700 rounded-full h-6 relative overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 flex items-center justify-end pr-4 ${
                  lucro > 0 ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-red-600 to-red-500'
                }`}
                style={{ width: `${Math.min(Math.abs(margemLucro) * 2, 100)}%` }}
              >
                <span className="text-white font-bold text-xs">
                  {result.indicadores_financeiros.lucro_liquido_estimado}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg border ${
          margemLucro > 15 ? 'bg-green-900/20 border-green-600' : 
          margemLucro > 10 ? 'bg-yellow-900/20 border-yellow-600' : 
          'bg-red-900/20 border-red-600'
        }`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              margemLucro > 15 ? 'text-green-400' : 
              margemLucro > 10 ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {margemLucro > 15 ? '✓' : margemLucro > 10 ? '⚠' : '✗'}
            </div>
            <div className="text-sm text-gray-300 mt-1">Rentabilidade</div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg border ${
          endividamento < 30 ? 'bg-green-900/20 border-green-600' : 
          endividamento < 50 ? 'bg-yellow-900/20 border-yellow-600' : 
          'bg-red-900/20 border-red-600'
        }`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              endividamento < 30 ? 'text-green-400' : 
              endividamento < 50 ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {endividamento < 30 ? '✓' : endividamento < 50 ? '⚠' : '✗'}
            </div>
            <div className="text-sm text-gray-300 mt-1">Endividamento</div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg border ${
          comprometimentoCredito < 40 ? 'bg-green-900/20 border-green-600' : 
          comprometimentoCredito < 60 ? 'bg-yellow-900/20 border-yellow-600' : 
          'bg-red-900/20 border-red-600'
        }`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              comprometimentoCredito < 40 ? 'text-green-400' : 
              comprometimentoCredito < 60 ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {comprometimentoCredito < 40 ? '✓' : comprometimentoCredito < 60 ? '⚠' : '✗'}
            </div>
            <div className="text-sm text-gray-300 mt-1">Capacidade</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreditScore = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    cnpj: '',
    companyName: '',
    companySector: '',
    creditValue: ''
  });
  const [sessionId] = useState(() => {
    // Generate persistent 24-character alphanumeric session ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  });
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CreditAnalysis | null>(null);
  const [error, setError] = useState('');

  const companySectors = [
    'Construtora',
    'Incorporadora', 
    'Construtora e Incorporadora',
    'Loja de Materiais de Construção',
    'Engenharia e Consultoria',
    'Arquitetura e Design',
    'Demolição e Terraplanagem',
    'Instalações Elétricas',
    'Instalações Hidráulicas',
    'Pintura e Acabamentos',
    'Serralheria e Esquadrias',
    'Paisagismo e Jardinagem',
    'Impermeabilização',
    'Estruturas Metálicas',
    'Pré-moldados de Concreto',
    'Pisos e Revestimentos',
    'Climatização e Refrigeração',
    'Segurança e Automação',
    'Gerenciamento de Obras'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      companySector: e.target.value
    }));
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData(prev => ({
      ...prev,
      cnpj: formatted
    }));
  };

  const validateForm = () => {
    if (!formData.cnpj.trim()) {
      setError('CNPJ é obrigatório');
      return false;
    }
    if (!formData.companyName.trim()) {
      setError('Nome da empresa é obrigatório');
      return false;
    }
    if (!formData.companySector.trim()) {
      setError('Setor da empresa é obrigatório');
      return false;
    }
    if (!formData.creditValue.trim()) {
      setError('Valor do crédito é obrigatório');
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Por favor, selecione um arquivo PDF ou imagem (JPG, PNG)');
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('O arquivo deve ter no máximo 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!validateForm() || !auth.currentUser) {
      return;
    }

    setUploading(true);
    setError('');

    try {
      let downloadURL = '';
      let fileName = '';
      let fileSize = 0;
      let fileType = '';

      // Upload file to Firebase Storage only if file is provided
      if (file) {
        const storageRef = ref(storage, `credit-analysis/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        downloadURL = await getDownloadURL(snapshot.ref);
        fileName = file.name;
        fileSize = file.size;
        fileType = file.type;
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'creditAnalysis'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        cnpj: formData.cnpj,
        companyName: formData.companyName,
        companySector: formData.companySector,
        fileName: fileName,
        fileUrl: downloadURL,
        fileSize: fileSize,
        fileType: fileType,
        creditValue: formData.creditValue,
        sessionId: sessionId,
        uploadedAt: new Date().toISOString(),
        status: 'processing'
      });

      // Send to webhook
      const webhookData = {
        requestId: docRef.id,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        nomeEmpresa: formData.companyName,
        setorEmpresa: formData.companySector,
        cnpj: formData.cnpj.replace(/[^\d]/g, ''), // Remove formatting, keep only numbers
        valorCredito: formData.creditValue.replace(/[^\d,]/g, ''), // Remove R$ and other non-numeric chars except comma
        sessionId: sessionId,
        ...(downloadURL && { fileUrl: downloadURL }),
        ...(file && { fileName: file.name }),
        timestamp: new Date().toISOString()
      };

      console.log('Sending to webhook:', webhookData);

      const response = await fetch('https://primary-production-2e3b.up.railway.app/webhook/credit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Webhook response:', result);
        
        // Parse the result - handle both array and direct object formats
        let parsedResult = null;
        
        if (Array.isArray(result) && result[0] && result[0].output) {
          // Format: [{ "output": "text with ```json\n{...}\n```" }]
          try {
            const jsonMatch = result[0].output.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[1]);
            } else {
              // Try to find JSON in the output without markdown formatting
              const jsonStart = result[0].output.indexOf('{');
              const jsonEnd = result[0].output.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonString = result[0].output.substring(jsonStart, jsonEnd + 1);
                parsedResult = JSON.parse(jsonString);
              }
            }
          } catch (error) {
            console.error('Error parsing JSON from output:', error);
          }
        } else if (result && typeof result === 'object') {
          // Direct object format
          parsedResult = result;
        }
        
        // Handle both old and new response formats
        let finalResult: CreditAnalysis | null = null;
        
        if (parsedResult && parsedResult.score) {
          // Old format - use as is
          finalResult = parsedResult;
        } else if (parsedResult && parsedResult.score_credito) {
          // New format - transform to old format
          const webhookResponse = parsedResult as WebhookCreditAnalysisResponse;
          finalResult = {
            score: webhookResponse.score_credito.valor,
            classificacao: webhookResponse.score_credito.classificacao,
            motivo: webhookResponse.score_credito.motivo,
            recomendacao_final: webhookResponse.recomendacao_final,
            entrada_sugerida: webhookResponse.condicoes_pagamento.entrada_sugerida,
            numero_parcelas: webhookResponse.condicoes_pagamento.numero_parcelas,
            valor_parcela: webhookResponse.condicoes_pagamento.valor_parcela,
            juros_mensal: webhookResponse.simulacao_financiamento.taxa_juros_mensal,
            valor_total_financiado: webhookResponse.condicoes_pagamento.valor_total_financiado,
            valor_total_pago: webhookResponse.simulacao_financiamento.valor_total_pago,
            lucro_liquido_estimado_operacao: webhookResponse.simulacao_financiamento.lucro_liquido_estimado_operacao,
            indicadores_cadastrais: {
              razao_social: webhookResponse.empresa.razao_social,
              cnpj: webhookResponse.empresa.cnpj,
              situacao_cadastral: webhookResponse.empresa.situacao_cadastral,
              capital_social: webhookResponse.dados_detalhados?.capital_social || webhookResponse.empresa.capital_social || 'N/A',
              data_abertura: webhookResponse.empresa.data_abertura,
              porte: webhookResponse.empresa.porte,
              atividade_principal: webhookResponse.empresa.atividade_principal,
              socio_administrador: webhookResponse.empresa.socio_administrador,
              estado: webhookResponse.empresa.estado,
              municipio: webhookResponse.empresa.municipio,
            },
            indicadores_financeiros: {
              receita_anual_estimativa: webhookResponse.analise_empresa.financeiro.receita_anual_estimada,
              lucro_liquido_estimado: webhookResponse.analise_empresa.financeiro.lucro_liquido_estimado_anual,
              divida_bancaria_estimativa: webhookResponse.analise_empresa.financeiro.divida_bancaria_total,
              percentual_divida_sobre_receita: webhookResponse.analise_empresa.financeiro.percentual_divida_sobre_receita,
              lucro_mensal_estimado: webhookResponse.analise_empresa.financeiro.lucro_mensal_estimado,
              valor_parcela_calculada: webhookResponse.condicoes_pagamento.valor_parcela,
              percentual_parcela_sobre_lucro: webhookResponse.analise_empresa.financeiro.percentual_parcela_sobre_lucro,
            },
            indicadores_operacionais: {
              obras_entregues_ultimo_ano: webhookResponse.analise_empresa.operacional.obras_entregues_ultimo_ano,
              tipo_principal_de_obra: webhookResponse.analise_empresa.operacional.tipo_principal_de_obra,
              regiao_de_atuacao: webhookResponse.analise_empresa.operacional.regiao_de_atuacao,
            },
            analise_interpretativa: webhookResponse.analise_empresa.analise_interpretativa,
            recomendacoes: webhookResponse.analise_empresa.recomendacoes,
            dados_detalhados: webhookResponse.dados_detalhados,
          };
        }
        
        if (finalResult && finalResult.score) {
          console.log('Parsed result:', parsedResult);
          setResult(finalResult);
        } else {
          console.error('No valid JSON found in response:', result);
          setError('Formato de resposta inválido. Não foi possível extrair os dados da análise.');
        }
      } else {
        const errorText = await response.text();
        console.error('Webhook error:', errorText);
        throw new Error('Erro ao processar o arquivo');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Erro ao fazer upload do arquivo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const event = { target: { files: [droppedFile] } } as any;
      handleFileSelect(event);
    }
  };

  const getRiskLevel = (score: number): 'low' | 'medium' | 'high' => {
    if (score >= 70) return 'low';
    if (score >= 40) return 'medium';
    return 'high';
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-white hover:text-blue-200 transition-colors mr-4"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <h1 className="text-2xl font-bold text-white">Credit Score PJ</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Análise de Credit Score Empresarial
              </h2>
              <p className="text-blue-100 text-lg">
                Informe os dados da empresa e faça o upload dos demonstrativos financeiros
              </p>
            </div>

            {/* Company Information Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  CNPJ da Empresa *
                </label>
                <input
                  type="text"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleCNPJChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Razão social da empresa"
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Company Sector */}
            <div className="mb-8">
              <label className="block text-white text-sm font-medium mb-2">
                Setor da Empresa *
              </label>
              <select
                name="companySector"
                value={formData.companySector}
                onChange={handleSectorChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="" className="bg-gray-800 text-gray-400">Selecione o setor da empresa</option>
                {companySectors.map((sector, index) => (
                  <option key={index} value={sector} className="bg-gray-800 text-white">
                    {sector}
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Value Input */}
            <div className="mb-8">
              <label className="block text-white text-sm font-medium mb-2">
                Valor do Crédito Solicitado *
              </label>
              <input
                type="text"
                name="creditValue"
                value={formData.creditValue}
                onChange={handleInputChange}
                placeholder="Ex: R$ 1.000.000,00"
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* File Upload Area */}
            <div
              className="border-2 border-dashed border-white/30 rounded-xl p-12 text-center hover:border-white/50 transition-colors cursor-pointer"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto text-white mb-4" size={48} />
              <h3 className="text-xl font-semibold text-white mb-2">
                {file ? file.name : 'Clique ou arraste os demonstrativos aqui'}
              </h3>
              <p className="text-blue-200 mb-4">
                Formatos aceitos: PDF, JPG, PNG (máx. 10MB) - OPCIONAL
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {file && (
                <div className="mt-4 p-4 bg-green-900/30 border border-green-600 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="text-green-400" size={20} />
                    <span className="text-green-200">Arquivo selecionado: {file.name}</span>
                  </div>
                </div>
              )}
              
              {!file && (
                <div className="mt-4 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="text-blue-400" size={20} />
                    <span className="text-blue-200">A análise pode ser feita apenas com os dados da empresa (PDF opcional)</span>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-red-400" size={20} />
                  <span className="text-red-200">{error}</span>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="mt-8 text-center">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`px-8 py-4 rounded-lg text-lg font-semibold transition-all ${
                  uploading
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    Analisando Credit Score...
                  </div>
                ) : (
                  'Analisar Credit Score'
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setFormData({ cnpj: '', companyName: '', companySector: '', creditValue: '' });
                  setError('');
                }}
                className="text-white hover:text-blue-200 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Relatório de Crédito Empresarial</h1>
                  <p className="text-blue-200 text-sm">{result.indicadores_cadastrais.razao_social}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                <Download size={16} />
                Exportar PDF
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Eye size={16} />
                Ver Detalhes
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Overview Section - Destaque Principal */}
        <section className="mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Score Gauge - Lado Esquerdo */}
              <div className="text-center">
                <ScoreGauge score={result.score} classification={result.classificacao} />
                <div className="mt-6 bg-gray-800/60 rounded-lg p-6 border border-gray-700">
                  <h4 className="text-lg font-bold text-white mb-3">Motivo da Classificação</h4>
                  <p className="text-gray-300 leading-relaxed">{result.motivo}</p>
                  {result.analise_interpretativa && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <h5 className="text-md font-bold text-blue-300 mb-2">Análise Interpretativa</h5>
                      <p className="text-gray-300 leading-relaxed text-sm">{result.analise_interpretativa}</p>
                    </div>
                  )}
                  
                  {/* Recomendações Finais */}
                  {result.recomendacao_final && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <h5 className="text-md font-bold text-green-300 mb-2 flex items-center gap-2">
                        <Target size={16} />
                        Recomendação Final
                      </h5>
                      <p className="text-gray-300 leading-relaxed text-sm">{result.recomendacao_final}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Assessment e Recomendação - Lado Direito */}
              <div className="space-y-6">
                <RiskIndicator 
                  level={getRiskLevel(result.score)} 
                  description={result.recomendacao_final || result.analise_interpretativa || result.motivo}
                />
                
                {/* Quick Stats da Empresa */}
                <div className="bg-gray-800/60 rounded-lg p-6 border border-gray-700">
                  <h4 className="text-lg font-bold text-white mb-4">Resumo da Empresa</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Situação:</span>
                      <span className="text-green-400 font-medium">{result.indicadores_cadastrais.situacao_cadastral}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Porte:</span>
                      <span className="text-white">{result.indicadores_cadastrais.porte}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Tempo de Mercado:</span>
                      <span className="text-white">{getCompanyAge(result.indicadores_cadastrais.data_abertura)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Receita Anual:</span>
                      <span className="text-white font-medium">{result.indicadores_financeiros.receita_anual_estimativa}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Capital Social:</span>
                      <span className="text-white font-medium">{result.indicadores_cadastrais.capital_social}</span>
                    </div>
                  </div>
                </div>
                
                {/* Recomendações */}
                {result.recomendacoes && result.recomendacoes.length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-6">
                    <h4 className="text-yellow-200 font-medium mb-3 flex items-center gap-2">
                      <Info size={20} />
                      Recomendações
                    </h4>
                    <ul className="space-y-2">
                      {result.recomendacoes.map((rec, index) => (
                        <li key={index} className="text-yellow-100 text-sm flex items-start gap-2">
                          <span className="text-yellow-400 mt-1">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Simulação de Pagamento - Seção Central Destacada */}
        <section className="mb-12">
          <PaymentSimulation result={result} />
        </section>

        {/* Análise de Fluxo de Caixa - Nova Seção */}
        <section className="mb-12">
          <CashFlowChart result={result} />
        </section>

        {/* Análise Detalhada - Grid de Informações */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Informações Cadastrais */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Building2 className="text-blue-400" />
              Informações Cadastrais
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Razão Social</label>
                  <p className="text-white font-medium">{result.indicadores_cadastrais.razao_social}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">CNPJ</label>
                  <p className="text-white font-medium">{result.indicadores_cadastrais.cnpj}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Capital Social</label>
                  <p className="text-white font-medium">{result.indicadores_cadastrais.capital_social}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Data de Abertura</label>
                  <p className="text-white font-medium">{formatDate(result.indicadores_cadastrais.data_abertura)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Situação Cadastral</label>
                  <p className="text-green-400 font-medium">{result.indicadores_cadastrais.situacao_cadastral}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Porte</label>
                  <p className="text-white font-medium">{result.indicadores_cadastrais.porte}</p>
                </div>
              </div>
              
              <div>
                <label className="text-gray-400 text-sm">Atividade Principal</label>
                <p className="text-white font-medium">{result.indicadores_cadastrais.atividade_principal}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Sócio Administrador</label>
                  <p className="text-white font-medium">{result.indicadores_cadastrais.socio_administrador}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Localização</label>
                  <p className="text-white font-medium">{result.indicadores_cadastrais.municipio}/{result.indicadores_cadastrais.estado}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Indicadores Financeiros */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <TrendingUp className="text-green-400" />
              Indicadores Financeiros
            </h2>
            
            <div className="space-y-6">
              <MetricCard
                icon={DollarSign}
                title="Receita Anual"
                value={formatCurrency(result.indicadores_financeiros.receita_anual_estimativa)}
                trend="up"
                color="green"
              />
              
              <MetricCard
                icon={TrendingUp}
                title="Lucro Líquido"
                value={formatCurrency(result.indicadores_financeiros.lucro_liquido_estimado)}
                subtitle="Anual estimado"
                color={result.indicadores_financeiros.lucro_liquido_estimado.includes('-') ? 'red' : 'blue'}
                trend={result.indicadores_financeiros.lucro_liquido_estimado.includes('-') ? 'down' : 'up'}
              />
              
              <MetricCard
                icon={AlertTriangle}
                title="Dívida Bancária"
                value={formatCurrency(result.indicadores_financeiros.divida_bancaria_estimativa)}
                subtitle={`${result.indicadores_financeiros.percentual_divida_sobre_receita} da receita`}
                color="yellow"
                trend="down"
              />

              {result.indicadores_financeiros.lucro_mensal_estimado && (
                <MetricCard
                  icon={Calendar}
                  title="Lucro Mensal"
                  value={formatCurrency(result.indicadores_financeiros.lucro_mensal_estimado)}
                  subtitle="Estimado"
                  color={result.indicadores_financeiros.lucro_mensal_estimado.includes('-') ? 'red' : 'purple'}
                  trend={result.indicadores_financeiros.lucro_mensal_estimado.includes('-') ? 'down' : 'up'}
                />
              )}
              
              {/* Indicador de Comprometimento */}
              {result.indicadores_financeiros.percentual_parcela_sobre_lucro && (
                <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={20} className="text-yellow-400" />
                    <span className="text-yellow-200 font-medium">Comprometimento</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {result.indicadores_financeiros.percentual_parcela_sobre_lucro}
                  </div>
                  <div className="text-yellow-200 text-sm">do lucro mensal</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Indicadores Operacionais */}
        <section className="mb-12">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <BarChart3 className="text-purple-400" />
              Performance Operacional
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                icon={Target}
                title="Obras Entregues"
                value={result.indicadores_operacionais.obras_entregues_ultimo_ano.toString()}
                subtitle="Último ano"
                color="blue"
                size="large"
              />
              
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600">
                    <Building2 size={24} className="text-white" />
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm font-medium mb-2">Especialização</h3>
                <p className="text-xl font-bold text-white">{result.indicadores_operacionais.tipo_principal_de_obra}</p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600">
                    <MapPin size={24} className="text-white" />
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm font-medium mb-2">Região de Atuação</h3>
                <p className="text-xl font-bold text-white">{result.indicadores_operacionais.regiao_de_atuacao}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Dados Detalhados da Empresa */}
        {result.dados_detalhados && (
          <section className="mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <FileText className="text-gray-400" />
                Dados Detalhados da Empresa
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <label className="text-gray-400 text-sm">Capital Social</label>
                  <p className="text-white font-medium text-lg">{result.dados_detalhados.capital_social}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <label className="text-gray-400 text-sm">Receita Estimada</label>
                  <p className="text-green-400 font-medium text-lg">{result.dados_detalhados.receita_estimada}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <label className="text-gray-400 text-sm">Lucro Estimado</label>
                  <p className="text-blue-400 font-medium text-lg">{result.dados_detalhados.lucro_estimado}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <label className="text-gray-400 text-sm">Dívida Total</label>
                  <p className="text-red-400 font-medium text-lg">{result.dados_detalhados.divida_total}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <label className="text-gray-400 text-sm">Obras Entregues</label>
                  <p className="text-purple-400 font-medium text-lg">{result.dados_detalhados.obras_entregues}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <label className="text-gray-400 text-sm">Região de Atuação</label>
                  <p className="text-orange-400 font-medium text-lg">{result.dados_detalhados.regiao_atuacao}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <section className="text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-6">Próximos Passos</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setResult(null);
                setFile(null);
                setFormData({ cnpj: '', companyName: '', companySector: '', creditValue: '' });
                setError('');
              }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl text-lg"
            >
              Nova Análise
            </button>
            <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all border border-white/30 text-lg">
              Salvar Relatório
            </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CreditScore;