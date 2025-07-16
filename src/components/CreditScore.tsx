import { useState, useRef } from 'react';
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
  Building2
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          /* Results */
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <CheckCircle className="mx-auto text-green-400 mb-4" size={64} />
              <h2 className="text-3xl font-bold text-white mb-4">
                Análise Concluída
              </h2>
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-bold text-white mb-2">Dados da Empresa</h3>
                <div className="grid md:grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-gray-400">CNPJ:</span>
                    <span className="text-white ml-2">{formData.cnpj}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Empresa:</span>
                    <span className="text-white ml-2">{formData.nomeEmpresa}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Setor:</span>
                    <span className="text-white ml-2">
                      {formData.setorEmpresa === 'Outros' ? formData.setorOutros : formData.setorEmpresa}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Valor Solicitado:</span>
                    <span className="text-white ml-2">{formData.valorCredito}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-6 text-center">
                <h3 className="text-lg font-bold text-purple-200 mb-2">Credit Score</h3>
                <div className="text-4xl font-bold text-white mb-2">
                  {result.creditScore || '750'}
                </div>
                <p className="text-purple-200">Pontuação</p>
              </div>

              <div className="bg-green-900/30 border border-green-600 rounded-lg p-6 text-center">
                <h3 className="text-lg font-bold text-green-200 mb-2">Status</h3>
                <div className="text-2xl font-bold text-white mb-2">
                  {result.status || 'Aprovado'}
                </div>
                <p className="text-green-200">Avaliação</p>
              </div>

              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-6 text-center">
                <h3 className="text-lg font-bold text-blue-200 mb-2">Taxa de Juros</h3>
                <div className="text-3xl font-bold text-white mb-2">
                  {result.taxaJuros || '2,5%'}
                </div>
                <p className="text-blue-200">ao mês</p>
              </div>
            </div>

            {/* Payment Options */}
            <div className="bg-white/5 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Opções de Pagamento</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-white mb-1">Entrada</div>
                  <div className="text-2xl font-bold text-green-400">
                    {result.entrada || 'R$ 50.000,00'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-white mb-1">Prestações</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {result.prestacoes || '24x R$ 8.500,00'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-white mb-1">Total</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {result.total || 'R$ 254.000,00'}
                  </div>
                </div>
              </div>
            </div>

            {result.observacoes && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-yellow-200 mb-2">Observações</h3>
                <p className="text-yellow-100">{result.observacoes}</p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => {
                  setFormData({ 
                    cnpj: '', 
                    nomeEmpresa: '', 
                    setorEmpresa: '', 
                    setorOutros: '', 
                    valorCredito: '' 
                  });
                  setFiles([]);
                  setResult(null);
                  setError('');
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Nova Análise
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CreditScore;