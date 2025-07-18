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
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Shield,
  AlertTriangle,
  XCircle,
  Target,
  Calendar,
  Users,
  MapPin,
  Activity
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { extractPDFData, validateFinancialPDF, formatExtractedDataForWebhook } from '../utils/pdfExtractor';
import { uploadMultipleFiles, validateFile, getStorageErrorMessage, DEFAULT_UPLOAD_CONFIG } from '../utils/storageUtils';

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
  const [extractionStatus, setExtractionStatus] = useState<{
    stage: 'idle' | 'extracting' | 'structuring' | 'analyzing' | 'complete';
    message: string;
    progress: number;
  }>({
    stage: 'idle',
    message: '',
    progress: 0
  });
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

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
      // Validar cada arquivo
      const validationErrors: string[] = [];
      
      selectedFiles.forEach((file, index) => {
        const validation = validateFile(file, DEFAULT_UPLOAD_CONFIG);
        if (!validation.isValid) {
          validationErrors.push(`Arquivo ${index + 1} (${file.name}): ${validation.error}`);
        }
      });
      
      if (validationErrors.length > 0) {
        setError(validationErrors.join('\n'));
        return;
      }
      
      setFiles(selectedFiles);
      setError('');
    }
  };

  const updateExtractionStatus = (stage: typeof extractionStatus.stage, message: string, progress: number) => {
    setExtractionStatus({ stage, message, progress });
  };

  const handleUpload = async () => {
    if (!auth.currentUser) return;
    
    if (!formData.cnpj || !formData.nomeEmpresa || !formData.categoriaEmpresa || !formData.valorCredito) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setUploading(true);
    setError('');
    setExtractionStatus({ stage: 'idle', message: '', progress: 0 });
    setUploadProgress({});

    try {
      const fileUrls: string[] = [];
      let extractedPDFData: any = null;
      
      // Upload files to Firebase Storage (if any)
      if (files.length > 0) {
        updateExtractionStatus('extracting', 'Extraindo dados do PDF...', 20);
        
        // Extract data from PDF files
        for (const file of files) {
          if (file.type === 'application/pdf') {
            try {
              const pdfData = await extractPDFData(file);
              updateExtractionStatus('structuring', 'Estruturando dados do PDF...', 50);
              
              const validation = validateFinancialPDF(pdfData);
              if (!validation.isValid) {
                console.warn('PDF validation warnings:', validation.warnings);
                console.error('PDF validation errors:', validation.errors);
              }
              
              extractedPDFData = formatExtractedDataForWebhook(pdfData);
              updateExtractionStatus('analyzing', 'Dados estruturados com sucesso...', 70);
            } catch (pdfError) {
              console.error('Error extracting PDF data:', pdfError);
              setError('Erro ao extrair dados do PDF. O arquivo será enviado para análise manual.');
            }
          }
        }
        
        updateExtractionStatus('analyzing', 'Fazendo upload dos arquivos...', 75);
        
        // Upload múltiplos arquivos com progresso
        const basePath = `credit-score/${auth.currentUser.uid}`;
        
        const uploadedUrls = await uploadMultipleFiles(
          files,
          basePath,
          DEFAULT_UPLOAD_CONFIG,
          (fileIndex, progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [`file-${fileIndex}`]: progress
            }));
          },
          (overallProgress) => {
            updateExtractionStatus('analyzing', `Enviando arquivos... ${overallProgress}%`, 75 + (overallProgress * 0.15));
          }
        );
        
        fileUrls.push(...uploadedUrls);
      } else {
        updateExtractionStatus('analyzing', 'Preparando análise básica...', 75);
      }

      updateExtractionStatus('analyzing', 'Salvando análise de crédito...', 90);

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
        status: 'processing',
        extractedPDFData
      });

      updateExtractionStatus('analyzing', 'Enviando para análise de crédito...', 95);

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
        timestamp: new Date().toISOString(),
        extractedPDFData
      };

      console.log('Enviando dados para webhook:', webhookData);

      const response = await fetch('https://primary-production-2e3b.up.railway.app/webhook/credit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      console.log('Resposta do webhook:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('Resultado recebido:', result);
        setResult(result);
        updateExtractionStatus('complete', 'Análise concluída!', 100);
      } else {
        const errorText = await response.text();
        console.error('Erro na resposta do webhook:', errorText);
        throw new Error('Erro ao processar os arquivos');
      }

    } catch (error) {
      console.error('Error uploading files:', error);
      
      const errorMessage = getStorageErrorMessage(error as Error);
      
      setError(`Erro ao processar a análise: ${errorMessage}`);
      updateExtractionStatus('idle', '', 0);
      setUploadProgress({});
    } finally {
      setUploading(false);
      if (extractionStatus.stage === 'complete') {
        setTimeout(() => setExtractionStatus({ stage: 'idle', message: '', progress: 0 }), 3000);
      }
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
    return <CreditScoreReport result={result} onBack={() => {
      setResult(null);
      setFiles([]);
      setError('');
    }} />;
  }

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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Análise de Credit Score Empresarial
            </h2>
            <p className="text-blue-100 text-lg">
              Análise de crédito baseada nos dados da empresa e demonstrativos financeiros (opcional)
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                CNPJ *
              </label>
              <input
                type="text"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="00.000.000/0001-00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Nome da Empresa *
              </label>
              <input
                type="text"
                name="nomeEmpresa"
                value={formData.nomeEmpresa}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Razão Social da Empresa"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Categoria da Empresa *
              </label>
              <input
                type="text"
                name="categoriaEmpresa"
                value={formData.categoriaEmpresa}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Construção Civil, Tecnologia, Comércio"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Valor do Crédito Solicitado *
              </label>
              <input
                type="text"
                name="valorCredito"
                value={formData.valorCredito}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="R$ 1.000.000"
                required
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className="border-2 border-dashed border-white/30 rounded-xl p-12 text-center hover:border-white/50 transition-colors cursor-pointer mb-6"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto text-white mb-4" size={48} />
            <h3 className="text-xl font-semibold text-white mb-2">
              {files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : 'Clique ou arraste seus demonstrativos aqui (opcional)'}
            </h3>
            <p className="text-blue-200 mb-4">
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
                  <div key={index} className="flex items-center justify-between p-3 bg-green-900/30 border border-green-600 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-green-400" size={20} />
                      <span className="text-green-200">{file.name}</span>
                      <span className="text-green-300 text-sm">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {files.length === 0 && (
              <div className="mt-4 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
                <p className="text-blue-200 text-sm">
                  💡 <strong>Dica:</strong> A análise pode ser feita apenas com os dados do formulário. 
                  O upload de demonstrativos financeiros é opcional e tornará a análise mais precisa.
                </p>
              </div>
            )}
          </div>

          {/* PDF Extraction Status */}
          {extractionStatus.stage !== 'idle' && (
            <div className="mt-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-blue-200 font-medium">{extractionStatus.message}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${extractionStatus.progress}%` }}
                />
              </div>
              <div className="text-blue-300 text-sm mt-2">
                {extractionStatus.progress}% concluído
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-red-400" size={20} />
                <span className="text-red-200">{error}</span>
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
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  {extractionStatus.stage !== 'idle' 
                    ? extractionStatus.message 
                    : files.length > 0 
                      ? 'Analisando documentos e dados...' 
                      : 'Analisando dados da empresa...'
                  }
                </div>
              ) : (
                files.length > 0 ? 'Analisar Credit Score Completo' : 'Analisar Credit Score Básico'
              )}
            </button>
            
            {files.length === 0 && (
              <p className="text-blue-200 text-sm mt-4">
                💡 <strong>Dica:</strong> Para melhor performance, use arquivos de até 5MB. 
                A análise pode ser feita apenas com os dados do formulário se preferir.
              </p>
            )}
            
            {files.length > 0 && (
              <div className="mt-4 p-3 bg-green-900/20 border border-green-600 rounded-lg">
                <p className="text-green-200 text-sm">
                  💡 <strong>Análise Avançada:</strong> Os arquivos serão enviados com retry automático em caso de falha de conexão.
                </p>
              </div>
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
    if (score >= 800) return '#10B981'; // green
    if (score >= 600) return '#F59E0B'; // yellow
    if (score >= 400) return '#F97316'; // orange
    return '#EF4444'; // red
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
          stroke="#374151"
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
          style={{
            filter: `drop-shadow(0 0 8px ${getScoreColor(animatedScore)})`
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-white mb-1">{animatedScore}</div>
        <div className="text-sm text-gray-300 font-medium">{getScoreLabel(animatedScore)}</div>
        <div className="text-xs text-gray-400">de 1000</div>
      </div>
    </div>
  );
};

// Componente de Gráfico de Barras Animado
const AnimatedBarChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">{item.label}</span>
            <span className="text-white font-bold">
              R$ {item.value.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1500 ease-out ${item.color}`}
              style={{
                width: animated ? `${(item.value / maxValue) * 100}%` : '0%',
                boxShadow: `0 0 20px ${item.color.includes('blue') ? '#3B82F6' : item.color.includes('green') ? '#10B981' : '#EF4444'}40`
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  R$ {item.value.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Componente de Gráfico de Pizza Animado
const AnimatedPieChart = ({ data, title }: { 
  data: { label: string; value: number; color: string }[]; 
  title: string;
}) => {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;

  const createPath = (percentage: number, cumulativePercentage: number) => {
    const startAngle = cumulativePercentage * 3.6;
    const endAngle = (cumulativePercentage + percentage) * 3.6;
    
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);
    
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    const x1 = 100 + 80 * Math.cos(startAngleRad);
    const y1 = 100 + 80 * Math.sin(startAngleRad);
    const x2 = 100 + 80 * Math.cos(endAngleRad);
    const y2 = 100 + 80 * Math.sin(endAngleRad);
    
    return `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6 text-center">{title}</h3>
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const path = createPath(percentage, cumulativePercentage);
              cumulativePercentage += percentage;
              
              return (
                <path
                  key={index}
                  d={path}
                  fill={item.color}
                  className={`transition-all duration-1000 ease-out ${animated ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    filter: `drop-shadow(0 0 8px ${item.color}40)`
                  }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                R$ {total.toLocaleString('pt-BR')}
              </div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-300">{item.label}</span>
            </div>
            <div className="text-white font-bold">
              R$ {item.value.toLocaleString('pt-BR')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de Indicadores com Ícones
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
      case 'success': return 'text-green-400 bg-green-900/30 border-green-600';
      case 'warning': return 'text-yellow-400 bg-yellow-900/30 border-yellow-600';
      case 'error': return 'text-red-400 bg-red-900/30 border-red-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'error': return <XCircle size={20} />;
    }
  };

  return (
    <div className={`rounded-xl p-6 border ${getStatusColor()}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-lg ${getStatusColor()}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-gray-300 text-sm">{description}</p>
        </div>
        {getStatusIcon()}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
};

// Componente principal do relatório
const CreditScoreReport = ({ result, onBack }: { result: CreditAnalysisResult; onBack: () => void }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Dados simulados para os gráficos
  const fluxoCaixaData = [
    { label: 'Receita Operacional', value: 2500000, color: 'bg-gradient-to-r from-green-500 to-green-600' },
    { label: 'Custos Operacionais', value: 1800000, color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
    { label: 'Lucro Líquido', value: 700000, color: 'bg-gradient-to-r from-purple-500 to-purple-600' },
  ];

  const endividamentoData = [
    { label: 'Faturamento Mensal', value: 208333, color: '#10B981' },
    { label: 'Dívidas Atuais', value: 85000, color: '#F59E0B' },
    { label: 'Novo Crédito', value: 50000, color: '#EF4444' },
  ];

  const capacidadeData = [
    { label: 'Capacidade Total', value: 150000, color: '#3B82F6' },
    { label: 'Comprometimento Atual', value: 85000, color: '#F59E0B' },
    { label: 'Margem Disponível', value: 65000, color: '#10B981' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={onBack}
              className="text-white hover:text-blue-200 transition-colors mr-4"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Relatório de Credit Score</h1>
                <p className="text-blue-200">{result.indicadores_cadastrais.razao_social}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Card Superior Reformulado */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-2xl p-8 mb-8 border border-blue-600/50 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Score Principal */}
            <div className="text-center">
              <AnimatedGauge score={result.score} size={220} />
            </div>
            
            {/* Informações da Empresa */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{result.indicadores_cadastrais.razao_social}</h2>
                <p className="text-blue-200 text-lg">{result.classificacao}</p>
                <p className="text-blue-100 mt-2">{result.motivo}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="text-blue-300" size={20} />
                    <div>
                      <p className="text-blue-200 text-sm">CNPJ</p>
                      <p className="text-white font-medium">{result.indicadores_cadastrais.cnpj}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="text-blue-300" size={20} />
                    <div>
                      <p className="text-blue-200 text-sm">Data de Abertura</p>
                      <p className="text-white font-medium">{result.indicadores_cadastrais.data_abertura}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="text-blue-300" size={20} />
                    <div>
                      <p className="text-blue-200 text-sm">Porte</p>
                      <p className="text-white font-medium">{result.indicadores_cadastrais.porte}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="text-blue-300" size={20} />
                    <div>
                      <p className="text-blue-200 text-sm">Localização</p>
                      <p className="text-white font-medium">{result.indicadores_cadastrais.municipio}/{result.indicadores_cadastrais.estado}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Activity className="text-blue-300" size={20} />
                    <div>
                      <p className="text-blue-200 text-sm">Situação</p>
                      <p className="text-white font-medium">{result.indicadores_cadastrais.situacao_cadastral}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-blue-300" size={20} />
                    <div>
                      <p className="text-blue-200 text-sm">Capital Social</p>
                      <p className="text-white font-medium">{result.indicadores_cadastrais.capital_social}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navegação por Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'overview', label: 'Visão Geral', icon: Target },
            { id: 'financing', label: 'Simulação de Financiamento', icon: DollarSign },
            { id: 'cashflow', label: 'Fluxo de Caixa', icon: TrendingUp },
            { id: 'analysis', label: 'Análise Comparativa', icon: PieChart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das Tabs */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              icon={XCircle}
              title="Capacidade"
              value="Limitada"
              status="error"
              description="Capacidade de pagamento comprometida com novo crédito"
            />
          </div>
        )}

        {activeTab === 'financing' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">Simulação de Financiamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-center">
                <DollarSign className="mx-auto mb-3 text-white" size={32} />
                <h4 className="text-white font-bold text-lg mb-2">Entrada Sugerida</h4>
                <p className="text-green-100 text-2xl font-bold">{result.entrada_sugerida}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-center">
                <Calendar className="mx-auto mb-3 text-white" size={32} />
                <h4 className="text-white font-bold text-lg mb-2">Parcelas</h4>
                <p className="text-blue-100 text-2xl font-bold">{result.numero_parcelas}x</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-center">
                <TrendingUp className="mx-auto mb-3 text-white" size={32} />
                <h4 className="text-white font-bold text-lg mb-2">Valor da Parcela</h4>
                <p className="text-purple-100 text-2xl font-bold">{result.valor_parcela}</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 text-center">
                <Activity className="mx-auto mb-3 text-white" size={32} />
                <h4 className="text-white font-bold text-lg mb-2">Taxa Mensal</h4>
                <p className="text-orange-100 text-2xl font-bold">{result.juros_mensal}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cashflow' && (
          <div className="space-y-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-8 text-center">Fluxo de Caixa Projetado (Anual)</h3>
              <AnimatedBarChart data={fluxoCaixaData} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AnimatedPieChart 
                data={endividamentoData} 
                title="Impacto do Crédito no Endividamento Mensal"
              />
              <AnimatedPieChart 
                data={capacidadeData} 
                title="Capacidade de Pagamento"
              />
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-8">
            {/* Gráfico Comparativo dos Indicadores */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-8 text-center">Análise Comparativa de Indicadores</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Rentabilidade */}
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="#374151" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="56" 
                        stroke="#10B981" 
                        strokeWidth="8" 
                        fill="transparent"
                        strokeDasharray={351.86}
                        strokeDashoffset={87.97}
                        strokeLinecap="round"
                        className="transition-all duration-2000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle className="text-green-400" size={32} />
                    </div>
                  </div>
                  <h4 className="text-white font-bold text-lg">Rentabilidade</h4>
                  <p className="text-green-400 font-medium">75% Positiva</p>
                </div>

                {/* Endividamento */}
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="#374151" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="56" 
                        stroke="#F59E0B" 
                        strokeWidth="8" 
                        fill="transparent"
                        strokeDasharray={351.86}
                        strokeDashoffset={140.74}
                        strokeLinecap="round"
                        className="transition-all duration-2000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AlertTriangle className="text-yellow-400" size={32} />
                    </div>
                  </div>
                  <h4 className="text-white font-bold text-lg">Endividamento</h4>
                  <p className="text-yellow-400 font-medium">60% Moderado</p>
                </div>

                {/* Capacidade */}
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="#374151" strokeWidth="8" fill="transparent" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="56" 
                        stroke="#EF4444" 
                        strokeWidth="8" 
                        fill="transparent"
                        strokeDasharray={351.86}
                        strokeDashoffset={246.30}
                        strokeLinecap="round"
                        className="transition-all duration-2000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <XCircle className="text-red-400" size={32} />
                    </div>
                  </div>
                  <h4 className="text-white font-bold text-lg">Capacidade</h4>
                  <p className="text-red-400 font-medium">30% Limitada</p>
                </div>
              </div>
            </div>

            {/* Informações Financeiras e Operacionais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h4 className="text-xl font-bold text-white mb-6">Indicadores Financeiros</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-300">Receita Anual Estimada</span>
                    <span className="text-white font-bold">{result.indicadores_financeiros.receita_anual_estimativa}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-300">Lucro Líquido Estimado</span>
                    <span className="text-white font-bold">{result.indicadores_financeiros.lucro_liquido_estimado}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-300">Dívida Bancária Estimada</span>
                    <span className="text-white font-bold">{result.indicadores_financeiros.divida_bancaria_estimativa}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h4 className="text-xl font-bold text-white mb-6">Performance Operacional</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-300">Obras Entregues (Último Ano)</span>
                    <span className="text-white font-bold">{result.indicadores_operacionais.obras_entregues_ultimo_ano}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-300">Especialização</span>
                    <span className="text-white font-bold">{result.indicadores_operacionais.tipo_principal_de_obra}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
                    <span className="text-gray-300">Região de Atuação</span>
                    <span className="text-white font-bold">{result.indicadores_operacionais.regiao_de_atuacao}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botão de Nova Análise */}
        <div className="text-center mt-12">
          <button
            onClick={onBack}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Nova Análise
          </button>
        </div>
      </main>
    </div>
  );
};

export default CreditScore;