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
  DollarSign
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';

const CreditScore = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    cnpj: '',
    valorDivida: ''
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      valorDivida: formatted
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
    if (!formData.cnpj || !formData.valorDivida || files.length === 0) {
      setError('Por favor, preencha todos os campos e faça upload dos demonstrativos');
      return;
    }

    if (!auth.currentUser) return;

    setUploading(true);
    setError('');

    try {
      // Upload files to Firebase Storage
      const fileUrls = await Promise.all(
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

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'creditScore'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        cnpj: formData.cnpj,
        valorDivida: formData.valorDivida,
        files: fileUrls,
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
        valorDivida: formData.valorDivida,
        files: fileUrls,
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
                Preencha os dados e faça upload dos demonstrativos financeiros
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-white font-semibold mb-2">
                  CNPJ da Empresa
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
                  Valor do Crédito
                </label>
                <input
                  type="text"
                  name="valorDivida"
                  value={formData.valorDivida}
                  onChange={handleValueChange}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* File Upload Area */}
            <div className="mb-8">
              <label className="block text-white font-semibold mb-4">
                Demonstrativos Financeiros
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
                disabled={!formData.cnpj || !formData.valorDivida || files.length === 0 || uploading}
                className={`px-8 py-4 rounded-lg text-lg font-semibold transition-all ${
                  !formData.cnpj || !formData.valorDivida || files.length === 0 || uploading
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
          </div>
        ) : (
          /* Results */
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <CheckCircle className="mx-auto text-green-400 mb-4" size={64} />
              <h2 className="text-3xl font-bold text-white mb-4">
                Análise Concluída
              </h2>
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
                  setFormData({ cnpj: '', valorDivida: '' });
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