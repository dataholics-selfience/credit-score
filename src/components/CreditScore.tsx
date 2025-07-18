import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Building2,
  TrendingUp,
  DollarSign,
  BarChart3,
  Shield,
  AlertTriangle,
  XCircle,
  Target,
  Calendar,
  Users,
  MapPin,
  Activity,
  CreditCard,
  Percent,
  Calculator
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';

interface CreditAnalysisResult {
  score: number;
  classificacao: string;
  motivo: string;
  entrada_sugerida: string;
  numero_parcelas: number;
  valor_parcela: string;
  juros_mensal: string;
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
  };
  indicadores_operacionais: {
    obras_entregues_ultimo_ano: number;
    tipo_principal_de_obra: string;
    regiao_de_atuacao: string;
  };
}

const CreditScore = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    cnpj: '',
    nomeEmpresa: '',
    categoriaEmpresa: '',
    valorCredito: '',
    sessionId: ''
  });
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CreditAnalysisResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Generate session ID on component mount
    setFormData(prev => ({
      ...prev,
      sessionId: Math.random().toString(36).substring(2, 15)
    }));
  }, []);

  const formatCurrency = (value: string) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    if (!numericValue) return '';
    
    // Convert to number and format with dots as thousand separators
    const number = parseInt(numericValue);
    return `R$ ${number.toLocaleString('pt-BR')}`;
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const formattedValue = formatCurrency(value);
    setFormData(prev => ({
      ...prev,
      valorCredito: formattedValue
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'valorCredito') {
      handleCurrencyChange(e);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      // Validate file types
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      const invalidFiles = selectedFiles.filter(file => !allowedTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        setError('Por favor, selecione apenas arquivos PDF ou imagem (JPG, PNG)');
        return;
      }
      
      // Validate file sizes (max 10MB each)
      const oversizedFiles = selectedFiles.filter(file => file.size > 10 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        setError('Cada arquivo deve ter no máximo 10MB');
        return;
      }
      
      setFiles(selectedFiles);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!auth.currentUser) return;
    
    if (!formData.cnpj || !formData.nomeEmpresa || !formData.categoriaEmpresa || !formData.valorCredito) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileUrls: string[] = [];
      
      // Upload files to Firebase Storage (if any)
      if (files.length > 0) {
        for (const file of files) {
          const storageRef = ref(storage, `credit-score/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          fileUrls.push(downloadURL);
        }
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'creditScore'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        cnpj: formData.cnpj,
        nomeEmpresa: formData.nomeEmpresa,
        categoriaEmpresa: formData.categoriaEmpresa,
        valorCredito: formData.valorCredito,
        sessionId: formData.sessionId,
        fileUrls,
        fileNames: files.length > 0 ? files.map(f => f.name) : [],
        hasDocuments: files.length > 0,
        uploadedAt: new Date().toISOString(),
        status: 'processing'
      });

      // Send to webhook
      const webhookData = {
        requestId: docRef.id,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        service: 'credit-score',
        cnpj: formData.cnpj,
        nomeEmpresa: formData.nomeEmpresa,
        categoriaEmpresa: formData.categoriaEmpresa,
        valorCredito: formData.valorCredito,
        sessionId: formData.sessionId,
        fileUrls,
        hasDocuments: files.length > 0,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('https://primary-production-2e3b.up.railway.app/webhook/credit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (response.ok) {
        const result = await response.json();
        setResult(result);
      } else {
        throw new Error('Erro ao processar os arquivos');
      }

    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Erro ao fazer upload dos arquivos. Tente novamente.');
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
    if (droppedFiles.length > 0) {
      const event = { target: { files: droppedFiles } } as any;
      handleFileSelect(event);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (result) {
    return <CreditScoreDashboard result={result} onBack={() => {
      setResult(null);
      setFiles([]);
      setError('');
    }} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition-colors mr-4"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Credit Score PJ</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Análise de Credit Score Empresarial
            </h2>
            <p className="text-gray-600 text-lg">
              Análise de crédito baseada nos dados da empresa e demonstrativos financeiros (opcional)
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNPJ *
              </label>
              <input
                type="text"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="00.000.000/0001-00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Empresa *
              </label>
              <input
                type="text"
                name="nomeEmpresa"
                value={formData.nomeEmpresa}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Razão Social da Empresa"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria da Empresa *
              </label>
              <input
                type="text"
                name="categoriaEmpresa"
                value={formData.categoriaEmpresa}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Construção Civil, Tecnologia, Comércio"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor do Crédito Solicitado *
              </label>
              <input
                type="text"
                name="valorCredito"
                value={formData.valorCredito}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="R$ 1.000.000"
                required
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors cursor-pointer mb-6"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : 'Clique ou arraste seus demonstrativos aqui (opcional)'}
            </h3>
            <p className="text-gray-600 mb-4">
              Formatos aceitos: PDF, JPG, PNG (máx. 10MB cada) - Opcional para análise mais precisa
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
            
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-green-600" size={20} />
                      <span className="text-green-800">{file.name}</span>
                      <span className="text-green-600 text-sm">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {files.length === 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Dica:</strong> A análise pode ser feita apenas com os dados do formulário. 
                  O upload de demonstrativos financeiros é opcional e tornará a análise mais precisa.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-red-600" size={20} />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="text-center">
            <button
              onClick={handleUpload}
              disabled={uploading || !formData.cnpj || !formData.nomeEmpresa || !formData.categoriaEmpresa || !formData.valorCredito}
              className={`px-8 py-4 rounded-lg text-lg font-semibold transition-all ${
                uploading || !formData.cnpj || !formData.nomeEmpresa || !formData.categoriaEmpresa || !formData.valorCredito
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  {files.length > 0 ? 'Analisando documentos e dados...' : 'Analisando dados da empresa...'}
                </div>
              ) : (
                files.length > 0 ? 'Analisar Credit Score Completo' : 'Analisar Credit Score Básico'
              )}
            </button>
            
            {files.length === 0 && (
              <p className="text-gray-600 text-sm mt-4">
                Análise baseada apenas nos dados informados no formulário
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// Componente do Gauge animado
const AnimatedGauge = ({ score, size = 200 }: { score: number; size?: number }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 500);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = size / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (animatedScore / 1000) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 800) return '#059669'; // green-600
    if (score >= 600) return '#D97706'; // amber-600
    if (score >= 400) return '#EA580C'; // orange-600
    return '#DC2626'; // red-600
  };

  const getScoreLabel = (score: number) => {
    if (score >= 800) return 'Excelente';
    if (score >= 600) return 'Bom';
    if (score >= 400) return 'Regular';
    return 'Baixo';
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="12"
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getScoreColor(animatedScore)}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-2000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-gray-900 mb-1">{animatedScore}</div>
        <div className="text-sm text-gray-600 font-medium">{getScoreLabel(animatedScore)}</div>
        <div className="text-xs text-gray-400">de 1000</div>
      </div>
    </div>
  );
};

// Componente de Donut Chart
const DonutChart = ({ 
  data, 
  title, 
  size = 200 
}: { 
  data: { label: string; value: number; color: string }[]; 
  title: string;
  size?: number;
}) => {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 40;
  const innerRadius = radius - 30;
  const circumference = 2 * Math.PI * radius;
  
  let cumulativePercentage = 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">{title}</h3>
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = circumference;
              const strokeDashoffset = circumference - (percentage / 100) * circumference;
              const rotation = (cumulativePercentage / 100) * 360;
              
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="30"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={animated ? strokeDashoffset : circumference}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{
                    transformOrigin: `${size / 2}px ${size / 2}px`,
                    transform: `rotate(${rotation}deg)`
                  }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                R$ {(total / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700 text-sm">{item.label}</span>
            </div>
            <div className="text-gray-900 font-semibold text-sm">
              R$ {(item.value / 1000).toFixed(0)}K
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de Indicador
const IndicatorCard = ({ 
  icon: Icon, 
  title, 
  value, 
  status, 
  description 
}: { 
  icon: any; 
  title: string; 
  value: string; 
  status: 'success' | 'warning' | 'error';
  description: string;
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle size={20} className="text-green-600" />;
      case 'warning': return <AlertTriangle size={20} className="text-amber-600" />;
      case 'error': return <XCircle size={20} className="text-red-600" />;
    }
  };

  return (
    <div className={`rounded-xl p-6 border ${getStatusColor()}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-lg ${getStatusColor()}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
        {getStatusIcon()}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
};

// Função para extrair valores numéricos das strings
const parseFinancialValue = (value: string): number => {
  if (!value) return 0;
  
  // Remove R$, pontos, vírgulas e espaços, mantém apenas números
  const numericString = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const number = parseFloat(numericString);
  
  return isNaN(number) ? 0 : number;
};

// Componente principal do dashboard
const CreditScoreDashboard = ({ result, onBack }: { result: CreditAnalysisResult; onBack: () => void }) => {
  // Parse dos dados financeiros
  const receitaAnual = parseFinancialValue(result.indicadores_financeiros?.receita_anual_estimativa || '0');
  const lucroLiquido = parseFinancialValue(result.indicadores_financeiros?.lucro_liquido_estimado || '0');
  const dividaBancaria = parseFinancialValue(result.indicadores_financeiros?.divida_bancaria_estimativa || '0');
  const valorParcela = parseFinancialValue(result.valor_parcela || '0');
  const entradaSugerida = parseFinancialValue(result.entrada_sugerida || '0');

  // Dados para os gráficos donut
  const fluxoCaixaData = [
    { label: 'Receita Anual', value: receitaAnual, color: '#059669' },
    { label: 'Lucro Líquido', value: lucroLiquido, color: '#2563EB' },
    { label: 'Dívidas', value: dividaBancaria, color: '#DC2626' },
  ];

  const financiamentoData = [
    { label: 'Entrada', value: entradaSugerida, color: '#059669' },
    { label: 'Financiado', value: valorParcela * result.numero_parcelas, color: '#2563EB' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Relatório de Credit Score</h1>
                  <p className="text-gray-600">{result.indicadores_cadastrais?.razao_social || 'N/A'}</p>
                </div>
              </div>
            </div>
            <button
              onClick={onBack}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Nova Análise
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Principal */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Score Gauge */}
            <div className="text-center">
              <AnimatedGauge score={result.score} size={220} />
            </div>
            
            {/* Informações da Empresa */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{result.indicadores_cadastrais?.razao_social || 'N/A'}</h2>
                <p className="text-blue-600 text-lg font-medium">{result.classificacao}</p>
                <p className="text-gray-600 mt-2">{result.motivo}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="text-gray-500" size={20} />
                    <div>
                      <p className="text-gray-500 text-sm">CNPJ</p>
                      <p className="text-gray-900 font-medium">{result.indicadores_cadastrais?.cnpj || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="text-gray-500" size={20} />
                    <div>
                      <p className="text-gray-500 text-sm">Data de Abertura</p>
                      <p className="text-gray-900 font-medium">{result.indicadores_cadastrais?.data_abertura || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="text-gray-500" size={20} />
                    <div>
                      <p className="text-gray-500 text-sm">Porte</p>
                      <p className="text-gray-900 font-medium">{result.indicadores_cadastrais?.porte || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-gray-500" size={20} />
                    <div>
                      <p className="text-gray-500 text-sm">Localização</p>
                      <p className="text-gray-900 font-medium">{result.indicadores_cadastrais?.municipio || 'N/A'}/{result.indicadores_cadastrais?.estado || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Activity className="text-gray-500" size={20} />
                    <div>
                      <p className="text-gray-500 text-sm">Situação</p>
                      <p className="text-gray-900 font-medium">{result.indicadores_cadastrais?.situacao_cadastral || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-gray-500" size={20} />
                    <div>
                      <p className="text-gray-500 text-sm">Capital Social</p>
                      <p className="text-gray-900 font-medium">{result.indicadores_cadastrais?.capital_social || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simulação de Financiamento */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Simulação de Financiamento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <DollarSign className="mx-auto mb-3 text-green-600" size={32} />
              <h4 className="text-gray-900 font-semibold text-lg mb-2">Entrada Sugerida</h4>
              <p className="text-green-600 text-2xl font-bold">{result.entrada_sugerida}</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <Calculator className="mx-auto mb-3 text-blue-600" size={32} />
              <h4 className="text-gray-900 font-semibold text-lg mb-2">Parcelas</h4>
              <p className="text-blue-600 text-2xl font-bold">{result.numero_parcelas}x</p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
              <CreditCard className="mx-auto mb-3 text-purple-600" size={32} />
              <h4 className="text-gray-900 font-semibold text-lg mb-2">Valor da Parcela</h4>
              <p className="text-purple-600 text-2xl font-bold">{result.valor_parcela}</p>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
              <Percent className="mx-auto mb-3 text-orange-600" size={32} />
              <h4 className="text-gray-900 font-semibold text-lg mb-2">Taxa Mensal</h4>
              <p className="text-orange-600 text-2xl font-bold">{result.juros_mensal}</p>
            </div>
          </div>
        </div>

        {/* Indicadores de Risco */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <IndicatorCard
            icon={TrendingUp}
            title="Rentabilidade"
            value="Positiva"
            status="success"
            description="Empresa apresenta boa capacidade de geração de lucro"
          />
          <IndicatorCard
            icon={AlertTriangle}
            title="Endividamento"
            value="Moderado"
            status="warning"
            description="Nível de endividamento dentro dos parâmetros aceitáveis"
          />
          <IndicatorCard
            icon={Shield}
            title="Capacidade"
            value="Adequada"
            status="success"
            description="Capacidade de pagamento compatível com o crédito solicitado"
          />
        </div>

        {/* Gráficos Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <DonutChart 
            data={fluxoCaixaData} 
            title="Situação Financeira Atual"
          />
          <DonutChart 
            data={financiamentoData} 
            title="Estrutura do Financiamento"
          />
        </div>

        {/* Informações Detalhadas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <BarChart3 className="text-blue-600" size={24} />
              Indicadores Financeiros
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Receita Anual Estimada</span>
                <span className="text-gray-900 font-semibold">{result.indicadores_financeiros?.receita_anual_estimativa || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Lucro Líquido Estimado</span>
                <span className="text-gray-900 font-semibold">{result.indicadores_financeiros?.lucro_liquido_estimado || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Dívida Bancária Estimada</span>
                <span className="text-gray-900 font-semibold">{result.indicadores_financeiros?.divida_bancaria_estimativa || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Target className="text-green-600" size={24} />
              Performance Operacional
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Obras Entregues (Último Ano)</span>
                <span className="text-gray-900 font-semibold">{result.indicadores_operacionais?.obras_entregues_ultimo_ano || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Especialização</span>
                <span className="text-gray-900 font-semibold">{result.indicadores_operacionais?.tipo_principal_de_obra || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Região de Atuação</span>
                <span className="text-gray-900 font-semibold">{result.indicadores_operacionais?.regiao_de_atuacao || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreditScore;