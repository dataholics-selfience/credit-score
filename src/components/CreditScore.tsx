import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  MapPin,
  User,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  ThumbsUp,
  Info,
  Download
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, doc, getDoc, setDoc } from 'firebase/firestore';

// Lista de setores empresariais
const BUSINESS_SECTORS = [
  'Construtora',
  'Incorporadora',
  'Loja de Materiais de Construção',
  'Imobiliária',
  'Arquitetura e Urbanismo',
  'Engenharia Civil',
  'Decoração e Design de Interiores',
  'Tecnologia da Informação',
  'Desenvolvimento de Software',
  'E-commerce',
  'Marketing Digital',
  'Consultoria Empresarial',
  'Contabilidade',
  'Advocacia',
  'Medicina e Saúde',
  'Odontologia',
  'Farmácia e Drogaria',
  'Educação e Ensino',
  'Alimentação e Restaurantes',
  'Supermercado e Varejo',
  'Moda e Vestuário',
  'Beleza e Estética',
  'Academia e Fitness',
  'Turismo e Hotelaria',
  'Transporte e Logística',
  'Automobilística',
  'Metalurgia e Siderurgia',
  'Química e Petroquímica',
  'Agricultura e Agronegócio',
  'Pecuária',
  'Indústria Alimentícia',
  'Indústria Têxtil',
  'Indústria Farmacêutica',
  'Energia e Utilities',
  'Telecomunicações',
  'Mídia e Comunicação',
  'Publicidade e Propaganda',
  'Seguros',
  'Bancos e Financeiras',
  'Investimentos',
  'Corretora de Valores',
  'Recursos Humanos',
  'Segurança Privada',
  'Limpeza e Conservação',
  'Manutenção Predial',
  'Jardinagem e Paisagismo',
  'Pet Shop e Veterinária',
  'Joalheria e Relojoaria',
  'Livraria e Papelaria',
  'Outros'
];

// Função para gerar sessionId alfanumérico de 24 caracteres
const generateSessionId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Função para obter ou criar sessionId persistente para o usuário
const getUserSessionId = async (userId: string): Promise<string> => {
  try {
    const sessionDoc = await getDoc(doc(db, 'userSessions', userId));
    
    if (sessionDoc.exists()) {
      return sessionDoc.data().sessionId;
    } else {
      // Criar novo sessionId para o usuário
      const newSessionId = generateSessionId();
      await setDoc(doc(db, 'userSessions', userId), {
        sessionId: newSessionId,
        createdAt: new Date().toISOString(),
        userId: userId
      });
      return newSessionId;
    }
  } catch (error) {
    console.error('Error getting user session ID:', error);
    // Fallback: gerar sessionId temporário se houver erro
    return generateSessionId();
  }
};

// Componente do Gauge Animado
const AnimatedGauge = ({ score, classification }: { score: number; classification: string }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (score > 0) {
      setIsAnimating(true);
      const duration = 2000; // 2 segundos
      const steps = 60; // 60 frames para animação suave
      const increment = score / steps;
      let currentScore = 0;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        currentScore = Math.min(score, increment * step);
        setAnimatedScore(Math.round(currentScore));

        if (step >= steps || currentScore >= score) {
          clearInterval(timer);
          setAnimatedScore(score);
          setIsAnimating(false);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [score]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Verde
    if (score >= 60) return '#F59E0B'; // Amarelo
    if (score >= 40) return '#F97316'; // Laranja
    return '#EF4444'; // Vermelho
  };

  const getClassificationColor = (classification: string) => {
    switch (classification.toLowerCase()) {
      case 'excelente': return 'text-green-400';
      case 'bom': return 'text-yellow-400';
      case 'regular': return 'text-orange-400';
      case 'ruim': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const circumference = 2 * Math.PI * 90; // raio de 90
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48 mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Círculo de fundo */}
          <circle
            cx="100"
            cy="100"
            r="90"
            stroke="#374151"
            strokeWidth="12"
            fill="none"
          />
          {/* Círculo de progresso */}
          <circle
            cx="100"
            cy="100"
            r="90"
            stroke={getScoreColor(animatedScore)}
            strokeWidth="12"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-100 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${getScoreColor(animatedScore)}40)`
            }}
          />
        </svg>
        
        {/* Score no centro */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-white mb-2">
            {animatedScore}
          </div>
          <div className="text-sm text-gray-400">SCORE</div>
        </div>
      </div>

      {/* Classificação */}
      <div className={`text-2xl font-bold mb-2 ${getClassificationColor(classification)}`}>
        {classification}
      </div>
    </div>
  );
};

// Componente de Barra de Progresso
const ProgressBar = ({ 
  value, 
  max, 
  label, 
  color = 'blue',
  showPercentage = true 
}: { 
  value: number; 
  max: number; 
  label: string; 
  color?: string;
  showPercentage?: boolean;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        {showPercentage && (
          <span className="text-sm text-gray-400">{percentage.toFixed(1)}%</span>
        )}
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div 
          className={`h-3 rounded-full transition-all duration-1000 ${getColorClasses(color)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Componente do Relatório Profissional
const ProfessionalCreditReport = ({ result }: { result: any }) => {
  const formatCurrency = (value: string) => {
    if (!value) return 'N/A';
    return value;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const parsePercentage = (percentStr: string): number => {
    if (!percentStr) return 0;
    return parseFloat(percentStr.replace('%', ''));
  };

  const parseCurrency = (currencyStr: string): number => {
    if (!currencyStr) return 0;
    return parseFloat(currencyStr.replace(/[R$\s.,]/g, '').replace(',', '.')) || 0;
  };

  // Calcular valores para análise
  const valorSolicitado = 1000000; // R$ 1.000.000 (exemplo)
  const entradaPercentual = parsePercentage(result.entrada_sugerida || '20%');
  const valorEntrada = valorSolicitado * (entradaPercentual / 100);
  const valorFinanciado = valorSolicitado - valorEntrada;
  const numeroParcelas = result.numero_parcelas || 6;
  const valorParcela = parseCurrency(result.valor_parcela || 'R$ 133.333,33');
  const valorTotalPago = valorEntrada + (valorParcela * numeroParcelas);
  const jurosMensal = parsePercentage(result.juros_mensal || '1.5%');

  // Indicadores de risco
  const parcelaLucroPercentual = parsePercentage(result.indicadores_financeiros?.percentual_parcela_sobre_lucro || '0%');
  const dividaReceitaPercentual = parsePercentage(result.indicadores_financeiros?.percentual_divida_sobre_receita || '0%');

  const getRiskLevel = (percentage: number) => {
    if (percentage > 100) return { level: 'Alto', color: 'text-red-400', bgColor: 'bg-red-900/30', borderColor: 'border-red-600' };
    if (percentage > 70) return { level: 'Médio', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30', borderColor: 'border-yellow-600' };
    return { level: 'Baixo', color: 'text-green-400', bgColor: 'bg-green-900/30', borderColor: 'border-green-600' };
  };

  const parcelaRisk = getRiskLevel(parcelaLucroPercentual);
  const dividaRisk = getRiskLevel(dividaReceitaPercentual);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header com Gauge e Informações da Empresa */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Gauge Score */}
          <div className="flex justify-center">
            <AnimatedGauge 
              score={result.score || 76} 
              classification={result.classificacao || 'Bom'} 
            />
          </div>

          {/* Informações da Empresa */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border-b border-gray-600 pb-4">
              <h1 className="text-3xl font-bold text-white mb-2">
                {result.indicadores_cadastrais?.razao_social || 'Empresa'}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-blue-400" />
                  <span className="text-sm">CNPJ: {result.indicadores_cadastrais?.cnpj || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-purple-400" />
                  <span className="text-sm">Porte: {result.indicadores_cadastrais?.porte || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-green-400" />
                  <span className="text-sm">
                    {result.indicadores_cadastrais?.municipio || 'N/A'}/{result.indicadores_cadastrais?.estado || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-yellow-400" />
                  <span className="text-sm">
                    Abertura: {formatDate(result.indicadores_cadastrais?.data_abertura)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Status da Empresa */}
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                result.indicadores_cadastrais?.situacao_cadastral === 'ATIVA' 
                  ? 'bg-green-900/30 text-green-300 border border-green-600' 
                  : 'bg-red-900/30 text-red-300 border border-red-600'
              }`}>
                {result.indicadores_cadastrais?.situacao_cadastral || 'N/A'}
              </div>
              <span className="text-gray-400 text-sm">
                Capital Social: {formatCurrency(result.indicadores_cadastrais?.capital_social)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Condições de Crédito - Destaque Principal */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-8 border-2 border-blue-500/50">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <DollarSign className="text-green-400" size={28} />
          Condições de Crédito Sugeridas
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Valores Principais */}
          <div className="space-y-6">
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-4xl font-bold text-white mb-2">
                {formatCurrency(`R$ ${valorSolicitado.toLocaleString('pt-BR')}`)}
              </h3>
              <p className="text-blue-200 text-lg">Valor Total Solicitado</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-xl font-bold text-green-300">
                  {result.entrada_sugerida || '20%'}
                </h4>
                <p className="text-gray-400 text-sm">Entrada</p>
                <p className="text-green-200 text-xs">
                  {formatCurrency(`R$ ${valorEntrada.toLocaleString('pt-BR')}`)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-xl font-bold text-blue-300">
                  {numeroParcelas}x
                </h4>
                <p className="text-gray-400 text-sm">Parcelas</p>
                <p className="text-blue-200 text-xs">
                  {formatCurrency(result.valor_parcela)}
                </p>
              </div>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-800/30 to-blue-800/30 rounded-xl p-6 border border-green-500/30">
              <h3 className="text-2xl font-bold text-white mb-2">
                {formatCurrency(`R$ ${valorTotalPago.toLocaleString('pt-BR')}`)}
              </h3>
              <p className="text-green-200 text-lg">Valor Total a Pagar</p>
              <p className="text-green-300 text-sm">
                +{((valorTotalPago / valorSolicitado - 1) * 100).toFixed(1)}% sobre o valor solicitado
              </p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-lg font-bold text-yellow-300">
                {result.juros_mensal || '1.5%'} a.m.
              </h4>
              <p className="text-gray-400 text-sm">Taxa de Juros Mensal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores Cadastrais */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Building2 className="text-blue-400" size={28} />
          Indicadores Cadastrais
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(result.indicadores_cadastrais || {}).map(([key, value]) => {
            if (!value || key === 'razao_social' || key === 'cnpj') return null;
            
            const labels: { [key: string]: string } = {
              'situacao_cadastral': 'Situação Cadastral',
              'capital_social': 'Capital Social',
              'data_abertura': 'Data de Abertura',
              'porte': 'Porte da Empresa',
              'atividade_principal': 'Atividade Principal',
              'socio_administrador': 'Sócio Administrador',
              'estado': 'Estado',
              'municipio': 'Município'
            };
            
            return (
              <div key={key} className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  {labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
                <p className="text-white font-semibold">
                  {key === 'data_abertura' ? formatDate(value as string) : value as string}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Análise Financeira */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <TrendingUp className="text-green-400" size={28} />
          Análise Financeira
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Indicadores Principais */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                <h4 className="text-lg font-bold text-green-200 mb-1">Receita Anual</h4>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(result.indicadores_financeiros?.receita_anual_estimativa)}
                </p>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                <h4 className="text-lg font-bold text-blue-200 mb-1">Lucro Líquido</h4>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(result.indicadores_financeiros?.lucro_liquido_estimado)}
                </p>
                <p className="text-blue-300 text-sm">
                  Mensal: {formatCurrency(result.indicadores_financeiros?.lucro_mensal_estimado)}
                </p>
              </div>
              
              <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-4">
                <h4 className="text-lg font-bold text-orange-200 mb-1">Dívida Bancária</h4>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(result.indicadores_financeiros?.divida_bancaria_estimativa)}
                </p>
              </div>
            </div>
          </div>

          {/* Indicadores de Risco */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">Indicadores de Risco</h3>
            
            {/* Parcela sobre Lucro */}
            <div className={`${parcelaRisk.bgColor} ${parcelaRisk.borderColor} border rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-white">Parcela / Lucro Mensal</h4>
                <div className="flex items-center gap-2">
                  {parcelaLucroPercentual > 100 ? (
                    <AlertTriangle className="text-red-400" size={20} />
                  ) : parcelaLucroPercentual > 70 ? (
                    <Info className="text-yellow-400" size={20} />
                  ) : (
                    <ThumbsUp className="text-green-400" size={20} />
                  )}
                  <span className={`font-bold ${parcelaRisk.color}`}>
                    {parcelaRisk.level}
                  </span>
                </div>
              </div>
              <ProgressBar 
                value={parcelaLucroPercentual} 
                max={150} 
                label={`${parcelaLucroPercentual.toFixed(1)}% do lucro mensal`}
                color={parcelaLucroPercentual > 100 ? 'red' : parcelaLucroPercentual > 70 ? 'yellow' : 'green'}
                showPercentage={false}
              />
              {parcelaLucroPercentual > 100 && (
                <p className="text-red-300 text-sm mt-2">
                  ⚠️ Parcela compromete mais que 100% do lucro mensal
                </p>
              )}
            </div>

            {/* Dívida sobre Receita */}
            <div className={`${dividaRisk.bgColor} ${dividaRisk.borderColor} border rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-white">Dívida / Receita Anual</h4>
                <span className={`font-bold ${dividaRisk.color}`}>
                  {dividaRisk.level}
                </span>
              </div>
              <ProgressBar 
                value={dividaReceitaPercentual} 
                max={50} 
                label={`${dividaReceitaPercentual.toFixed(1)}% da receita anual`}
                color={dividaReceitaPercentual > 30 ? 'red' : dividaReceitaPercentual > 20 ? 'yellow' : 'green'}
                showPercentage={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores Operacionais */}
      {result.indicadores_operacionais && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <BarChart3 className="text-purple-400" size={28} />
            Performance Operacional
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-purple-900/20 border border-purple-600 rounded-lg p-6 text-center">
              <h4 className="text-3xl font-bold text-purple-300 mb-2">
                {result.indicadores_operacionais.obras_entregues_ultimo_ano || 0}
              </h4>
              <p className="text-purple-200">Obras Entregues (Último Ano)</p>
            </div>
            
            <div className="bg-indigo-900/20 border border-indigo-600 rounded-lg p-6">
              <h4 className="text-lg font-bold text-indigo-200 mb-2">Especialização</h4>
              <p className="text-white">
                {result.indicadores_operacionais.tipo_principal_de_obra || 'N/A'}
              </p>
            </div>
            
            <div className="bg-cyan-900/20 border border-cyan-600 rounded-lg p-6">
              <h4 className="text-lg font-bold text-cyan-200 mb-2">Região de Atuação</h4>
              <p className="text-white">
                {result.indicadores_operacionais.regiao_de_atuacao || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Análise Interpretativa */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl p-8 border border-gray-600">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <FileText className="text-yellow-400" size={28} />
          Análise Interpretativa
        </h2>
        
        <div className="space-y-6">
          {/* Motivo da Classificação */}
          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-200 mb-3">Justificativa do Score</h3>
            <p className="text-gray-200 leading-relaxed">
              {result.motivo || 'Análise baseada nos indicadores financeiros e operacionais da empresa.'}
            </p>
          </div>

          {/* Recomendação Final */}
          {result.recomendacao_final && (
            <div className="bg-green-900/20 border border-green-600 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-200 mb-3 flex items-center gap-2">
                <ThumbsUp size={20} />
                Recomendação Final
              </h3>
              <p className="text-gray-200 leading-relaxed">
                {result.recomendacao_final}
              </p>
            </div>
          )}

          {/* Pontos de Atenção */}
          {(parcelaLucroPercentual > 100 || dividaReceitaPercentual > 30) && (
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-200 mb-3 flex items-center gap-2">
                <AlertTriangle size={20} />
                Pontos de Atenção
              </h3>
              <ul className="text-gray-200 space-y-2">
                {parcelaLucroPercentual > 100 && (
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>A parcela mensal compromete {parcelaLucroPercentual.toFixed(1)}% do lucro mensal estimado, indicando alto risco de inadimplência.</span>
                  </li>
                )}
                {dividaReceitaPercentual > 30 && (
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>O nível de endividamento representa {dividaReceitaPercentual.toFixed(1)}% da receita anual, sugerindo necessidade de monitoramento.</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Botão de Download/Impressão */}
      <div className="text-center">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Download size={20} />
          Imprimir Relatório
        </button>
      </div>
    </div>
  );
};

const CreditScore = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    cnpj: '',
    nomeEmpresa: '',
    setorEmpresa: '',
    setorOutros: '',
    valorCredito: ''
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData(prev => ({
      ...prev,
      cnpj: formatted
    }));
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setFormData(prev => ({
      ...prev,
      valorCredito: formatted
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles = selectedFiles.filter(file => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Apenas arquivos PDF e imagens são aceitos');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Cada arquivo deve ter no máximo 10MB');
        return false;
      }
      return true;
    });
    
    setFiles(prev => [...prev, ...validFiles]);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.cnpj || !formData.nomeEmpresa || !formData.setorEmpresa || !formData.valorCredito) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (formData.setorEmpresa === 'Outros' && !formData.setorOutros.trim()) {
      setError('Por favor, especifique o setor da empresa');
      return;
    }

    if (!auth.currentUser) return;

    setUploading(true);
    setError('');

    try {
      // Obter sessionId persistente do usuário
      const sessionId = await getUserSessionId(auth.currentUser.uid);

      let fileUrls: any[] = [];

      // Upload files to Firebase Storage (se houver arquivos)
      if (files.length > 0) {
        fileUrls = await Promise.all(
          files.map(async (file) => {
            const storageRef = ref(storage, `demonstrativos/${auth.currentUser!.uid}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return {
              name: file.name,
              url: downloadURL,
              size: file.size,
              type: file.type
            };
          })
        );
      }

      // Determinar setor final
      const setorFinal = formData.setorEmpresa === 'Outros' ? formData.setorOutros.trim() : formData.setorEmpresa;

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'creditScore'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        cnpj: formData.cnpj,
        nomeEmpresa: formData.nomeEmpresa.trim(),
        setorEmpresa: setorFinal,
        valorCredito: formData.valorCredito,
        files: fileUrls,
        uploadedAt: new Date().toISOString(),
        status: 'processing'
      });

      // Preparar dados para o webhook
      const webhookData = {
        requestId: docRef.id,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        service: 'credit-score',
        sessionId: sessionId,
        cnpj: formData.cnpj,
        nomeEmpresa: formData.nomeEmpresa.trim(),
        setorEmpresa: setorFinal,
        valorCredito: formData.valorCredito,
        files: fileUrls,
        timestamp: new Date().toISOString()
      };

      console.log('Enviando dados para webhook:', webhookData);

      // Send to webhook
      const response = await fetch('https://primary-production-2e3b.up.railway.app/webhook/credit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Resultado recebido:', result);
        setResult(result);
      } else {
        throw new Error('Erro ao processar a análise');
      }

    } catch (error) {
      console.error('Error processing credit score:', error);
      setError('Erro ao processar análise de crédito. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const event = { target: { files: droppedFiles } } as any;
    handleFileSelect(event);
  };

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
                <CreditCard className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-white">Credit Score PJ</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!result ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Análise de Credit Score PJ
              </h2>
              <p className="text-blue-100 text-lg">
                Preencha os dados da empresa e opcionalmente faça upload dos demonstrativos financeiros
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-6 mb-8">
              {/* CNPJ e Nome da Empresa */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-semibold mb-2">
                    CNPJ da Empresa *
                  </label>
                  <input
                    type="text"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleCNPJChange}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    name="nomeEmpresa"
                    value={formData.nomeEmpresa}
                    onChange={handleInputChange}
                    placeholder="Razão social ou nome fantasia"
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Setor da Empresa */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Setor da Empresa *
                </label>
                <select
                  name="setorEmpresa"
                  value={formData.setorEmpresa}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="" className="bg-gray-800">Selecione o setor</option>
                  {BUSINESS_SECTORS.map((sector) => (
                    <option key={sector} value={sector} className="bg-gray-800">
                      {sector}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo "Outros" - aparece apenas quando "Outros" é selecionado */}
              {formData.setorEmpresa === 'Outros' && (
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Especifique o Setor *
                  </label>
                  <input
                    type="text"
                    name="setorOutros"
                    value={formData.setorOutros}
                    onChange={handleInputChange}
                    placeholder="Descreva o setor da sua empresa"
                    className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Valor do Crédito */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Valor do Crédito *
                </label>
                <input
                  type="text"
                  name="valorCredito"
                  value={formData.valorCredito}
                  onChange={handleValueChange}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* File Upload Area - Optional */}
            <div className="mb-8">
              <label className="block text-white font-semibold mb-4">
                Demonstrativos Financeiros (Opcional)
              </label>
              
              <div
                className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-white/50 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto text-white mb-4" size={48} />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Clique ou arraste os demonstrativos aqui
                </h3>
                <p className="text-blue-200 mb-4">
                  Formatos aceitos: PDF, JPG, PNG (máx. 10MB cada)
                </p>
                <p className="text-sm text-gray-300">
                  📄 Upload opcional - pode melhorar a precisão da análise
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                />
              </div>

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-white font-medium">Arquivos selecionados:</h4>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="text-blue-400" size={20} />
                        <span className="text-white">{file.name}</span>
                        <span className="text-gray-400 text-sm">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-red-400" size={20} />
                  <span className="text-red-200">{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="text-center">
              <button
                onClick={handleSubmit}
                disabled={!formData.cnpj || !formData.nomeEmpresa || !formData.setorEmpresa || !formData.valorCredito || uploading || (formData.setorEmpresa === 'Outros' && !formData.setorOutros.trim())}
                className={`px-8 py-4 rounded-lg text-lg font-semibold transition-all ${
                  !formData.cnpj || !formData.nomeEmpresa || !formData.setorEmpresa || !formData.valorCredito || uploading || (formData.setorEmpresa === 'Outros' && !formData.setorOutros.trim())
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    Analisando...
                  </div>
                ) : (
                  'Analisar Credit Score'
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-8 bg-blue-900/30 border border-blue-600 rounded-lg p-4">
              <h4 className="text-blue-200 font-medium mb-2 flex items-center gap-2">
                <Building2 size={16} />
                Como funciona
              </h4>
              <ul className="text-blue-100 text-sm space-y-1">
                <li>• CNPJ, nome da empresa, setor e valor do crédito são obrigatórios</li>
                <li>• Demonstrativos financeiros são opcionais mas podem melhorar a precisão</li>
                <li>• A análise considera dados públicos e informações fornecidas</li>
                <li>• Resultado inclui score, taxa de juros e opções de pagamento</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Professional Credit Report */
          <ProfessionalCreditReport result={result} />
        )}
      </main>
    </div>
  );
};

export default CreditScore;