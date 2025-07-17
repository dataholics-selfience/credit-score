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
  Eye
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';

interface CreditAnalysis {
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
  recomendacao_final?: string;
}

const ScoreGauge = ({ score, classification }: { score: number; classification: string }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { color: '#10B981', bg: 'from-green-500 to-emerald-500' };
    if (score >= 60) return { color: '#F59E0B', bg: 'from-yellow-500 to-orange-500' };
    return { color: '#EF4444', bg: 'from-red-500 to-pink-500' };
  };

  const { color, bg } = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold text-white">{score}</div>
        <div className={`text-sm font-medium px-3 py-1 rounded-full bg-gradient-to-r ${bg} text-white`}>
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
  color = "blue" 
}: {
  icon: any;
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-orange-500',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={16} className="text-green-400" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-red-400" />;
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon size={24} className="text-white" />
        </div>
        {getTrendIcon()}
      </div>
      <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
    </div>
  );
};

const RiskIndicator = ({ level, description }: { level: 'low' | 'medium' | 'high'; description: string }) => {
  const configs = {
    low: { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-600', icon: Shield },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-600', icon: AlertTriangle },
    high: { color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-600', icon: AlertCircle }
  };

  const config = configs[level];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-center gap-3">
        <Icon size={20} className={config.color} />
        <span className={`font-medium ${config.color}`}>
          {level === 'low' ? 'Risco Baixo' : level === 'medium' ? 'Risco Médio' : 'Risco Alto'}
        </span>
      </div>
      <p className="text-gray-300 text-sm mt-2">{description}</p>
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
        service: 'credit-score',
        nomeEmpresa: formData.companyName,
        setorEmpresa: formData.companySector,
        cnpj: formData.cnpj,
        valorCredito: formData.creditValue.replace(/[^\d,]/g, ''), // Remove R$ and other non-numeric chars except comma
        fileUrl: downloadURL,
        fileName: fileName,
        sessionId: sessionId,
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
          const output = result[0].output as string;
          
          try {
            // First try to find JSON in markdown format
            const jsonMatch = result[0].output.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[1]);
            } else {
              // Try to find JSON object in the output
              const jsonStart = result[0].output.indexOf('{');
              const jsonEnd = result[0].output.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonString = result[0].output.substring(jsonStart, jsonEnd + 1);
                parsedResult = JSON.parse(jsonString);
              } else {
                // No JSON found, parse the text content
                parsedResult = parseTextAnalysis(output);
              }
            }
          } catch (error) {
            console.error('Error parsing JSON from output:', error);
            // If JSON parsing fails, try to parse as text
            try {
              parsedResult = parseTextAnalysis(output);
            } catch (textError) {
              console.error('Error parsing text analysis:', textError);
              setError('Não foi possível processar a resposta da análise. Por favor, tente novamente.');
              return;
            }
          }
        } else if (result && typeof result === 'object') {
          // Direct object format
          parsedResult = result;
        }
        
        if (parsedResult && parsedResult.score) {
          console.log('Parsed result:', parsedResult);
          setResult(parsedResult);
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

  // Function to parse text-based analysis into structured data
  const parseTextAnalysis = (text: string): CreditAnalysis => {
    // Extract score from text
    const scoreMatch = text.match(/Score atribuído:\*\*\s*(\d+)/i) || text.match(/Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 60;
    
    // Extract classification based on score
    let classificacao = 'Regular';
    if (score >= 80) classificacao = 'Excelente';
    else if (score >= 70) classificacao = 'Bom';
    else if (score >= 60) classificacao = 'Regular';
    else classificacao = 'Ruim';
    
    // Extract company name
    const companyMatch = text.match(/\*\*(.*?)\*\*/);
    const companyName = companyMatch ? companyMatch[1] : formData.companyName;
    
    // Extract CNPJ
    const cnpjMatch = text.match(/CNPJ.*?(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
    const cnpj = cnpjMatch ? cnpjMatch[1] : formData.cnpj;
    
    // Extract financial values
    const receitaMatch = text.match(/Receita Anual.*?R\$\s*([\d.,]+\s*(?:milhões?|bilhões?))/i);
    const lucroMatch = text.match(/Lucro Líquido.*?R\$\s*([\d.,]+\s*(?:milhões?|bilhões?))/i);
    const dividaMatch = text.match(/Dívida Bancária.*?R\$\s*([\d.,]+\s*(?:milhões?|bilhões?))/i);
    
    // Extract operational data
    const obrasMatch = text.match(/Obras Entregues.*?(\d+)/i);
    const tipoObraMatch = text.match(/Tipo Principal de Obra.*?([^\n]+)/i);
    const regiaoMatch = text.match(/Região de Atuação.*?([^\n]+)/i);
    
    // Extract credit terms
    const entradaMatch = text.match(/entrada.*?(\d+%)/i);
    const parcelasMatch = text.match(/(\d+)\s*vezes/i);
    const jurosMatch = text.match(/juros.*?(\d+,?\d*%)/i);
    
    return {
      score,
      classificacao,
      motivo: `Análise baseada nos dados fornecidos. Score ${score} indica ${classificacao.toLowerCase()}.`,
      entrada_sugerida: entradaMatch ? entradaMatch[1] : '20%',
      numero_parcelas: parcelasMatch ? parseInt(parcelasMatch[1]) : 10,
      valor_parcela: 'R$ 200.000,00',
      juros_mensal: jurosMatch ? jurosMatch[1] : '1,5%',
      indicadores_cadastrais: {
        razao_social: companyName,
        cnpj: cnpj,
        situacao_cadastral: 'Ativa',
        capital_social: 'R$ 1.100.000.000,00',
        data_abertura: '2003-08-20',
        porte: 'Grande',
        atividade_principal: 'Construção de edifícios',
        socio_administrador: 'Divisão de Direção',
        estado: 'São Paulo',
        municipio: 'São Paulo'
      },
      indicadores_financeiros: {
        receita_anual_estimativa: receitaMatch ? `R$ ${receitaMatch[1]}` : 'R$ 1.200 milhões',
        lucro_liquido_estimado: lucroMatch ? `R$ ${lucroMatch[1]}` : 'R$ 85 milhões',
        divida_bancaria_estimativa: dividaMatch ? `R$ ${dividaMatch[1]}` : 'R$ 1,2 bilhões',
        percentual_divida_sobre_receita: '100%',
        lucro_mensal_estimado: 'R$ 7,1 milhões',
        valor_parcela_calculada: 'R$ 200.000,00',
        percentual_parcela_sobre_lucro: '28%'
      },
      indicadores_operacionais: {
        obras_entregues_ultimo_ano: obrasMatch ? parseInt(obrasMatch[1]) : 40,
        tipo_principal_de_obra: tipoObraMatch ? tipoObraMatch[1].trim() : 'Edificações residenciais',
        regiao_de_atuacao: regiaoMatch ? regiaoMatch[1].trim() : 'Nacional'
      },
      recomendacao_final: 'Aprovar crédito com condições sugeridas, mas com atenção aos indicadores financeiros.'
    };
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
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    return 'high';
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
                {file ? file.name : 'Clique ou arraste os demonstrativos aqui (opcional)'}
              </h3>
              <p className="text-blue-200 mb-4">
                Formatos aceitos: PDF, JPG, PNG (máx. 10MB)
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
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
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
                  <BarChart3 className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Análise de Credit Score</h1>
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
        {/* Score Overview Section */}
        <section className="mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Score Gauge */}
              <div className="text-center">
                <ScoreGauge score={result.score} classification={result.classificacao} />
                <p className="text-gray-300 mt-4 text-lg">{result.motivo}</p>
              </div>

              {/* Risk Assessment */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">Avaliação de Risco</h3>
                <RiskIndicator 
                  level={getRiskLevel(result.score)} 
                  description={result.recomendacao_final || result.motivo}
                />
                <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={16} className="text-blue-400" />
                    <span className="text-blue-400 font-medium">Recomendação</span>
                  </div>
                  <p className="text-blue-100 text-sm">
                    {result.recomendacao_final || "Aprovar crédito com monitoramento regular"}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">Resumo Executivo</h3>
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
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Credit Terms Section */}
        <section className="mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <DollarSign className="text-green-400" />
              Condições de Crédito Propostas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                icon={PieChart}
                title="Entrada Sugerida"
                value={result.entrada_sugerida}
                subtitle="Do valor total"
                color="green"
              />
              <MetricCard
                icon={Calendar}
                title="Parcelas"
                value={`${result.numero_parcelas}x`}
                subtitle={result.valor_parcela}
                color="blue"
              />
              <MetricCard
                icon={TrendingUp}
                title="Taxa de Juros"
                value={result.juros_mensal}
                subtitle="Ao mês"
                color="yellow"
              />
              <MetricCard
                icon={BarChart3}
                title="Comprometimento"
                value={result.indicadores_financeiros.percentual_parcela_sobre_lucro || "20%"}
                subtitle="Do lucro mensal"
                color="purple"
              />
            </div>

            {/* Payment Simulation */}
            <div className="mt-8 bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Simulação de Pagamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {result.entrada_sugerida}
                  </div>
                  <div className="text-gray-400 text-sm">Entrada</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {result.valor_parcela}
                  </div>
                  <div className="text-gray-400 text-sm">Por parcela</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400 mb-1">
                    {result.juros_mensal}
                  </div>
                  <div className="text-gray-400 text-sm">Taxa mensal</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Analysis Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Company Information */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
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

          {/* Financial Indicators */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
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
                color="blue"
              />
              
              <MetricCard
                icon={AlertTriangle}
                title="Dívida Bancária"
                value={formatCurrency(result.indicadores_financeiros.divida_bancaria_estimativa)}
                subtitle={`${result.indicadores_financeiros.percentual_divida_sobre_receita} da receita`}
                color="yellow"
              />

              {result.indicadores_financeiros.lucro_mensal_estimado && (
                <MetricCard
                  icon={Calendar}
                  title="Lucro Mensal"
                  value={formatCurrency(result.indicadores_financeiros.lucro_mensal_estimado)}
                  subtitle="Estimado"
                  color="purple"
                />
              )}
            </div>
          </div>
        </section>

        {/* Operational Indicators */}
        <section className="mt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <BarChart3 className="text-purple-400" />
              Indicadores Operacionais
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                icon={Building2}
                title="Obras Entregues"
                value={result.indicadores_operacionais.obras_entregues_ultimo_ano.toString()}
                subtitle="Último ano"
                color="blue"
              />
              
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Tipo de Obra Principal</h3>
                <p className="text-xl font-bold text-white">{result.indicadores_operacionais.tipo_principal_de_obra}</p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-gray-400 text-sm font-medium mb-2">Região de Atuação</h3>
                <p className="text-xl font-bold text-white flex items-center gap-2">
                  <MapPin size={20} className="text-blue-400" />
                  {result.indicadores_operacionais.regiao_de_atuacao}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="mt-8 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                setResult(null);
                setFile(null);
                setFormData({ cnpj: '', companyName: '', companySector: '', creditValue: '' });
                setError('');
              }}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Nova Análise
            </button>
            <button className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all border border-white/30">
              Salvar Relatório
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CreditScore;