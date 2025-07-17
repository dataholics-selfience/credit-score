import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';

const RendaPresumida = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Por favor, selecione um arquivo PDF ou imagem (JPG, PNG)');
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('O arquivo deve ter no máximo 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!auth.currentUser) return;

    setUploading(true);
    setError('');

    try {
      let downloadURL = '';
      let fileName = '';
      let fileSize = 0;
      let fileType = '';

      // Upload file to Firebase Storage only if file is provided
      if (file) {
        const storageRef = ref(storage, `holerites/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        downloadURL = await getDownloadURL(snapshot.ref);
        fileName = file.name;
        fileSize = file.size;
        fileType = file.type;
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'rendaPresumida'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        fileName: fileName,
        fileUrl: downloadURL,
        fileSize: fileSize,
        fileType: fileType,
        uploadedAt: new Date().toISOString(),
        status: 'processing'
      });

      // Send to webhook
      const webhookData = {
        requestId: docRef.id,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        service: 'renda-presumida',
        fileUrl: downloadURL,
        fileName: fileName,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('https://primary-production-2e3b.up.railway.app/webhook/renda-presumida', {
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
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-white">Renda Presumida</h1>
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
                Análise de Renda Presumida
              </h2>
              <p className="text-blue-100 text-lg">
                Faça o upload do seu holerite para descobrir a renda presumida
              </p>
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
                {file ? file.name : 'Clique ou arraste seu holerite aqui (opcional)'}
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
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    Analisando...
                  </div>
                ) : (
                  'Analisar Renda'
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

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-900/30 border border-green-600 rounded-lg p-6">
                <h3 className="text-xl font-bold text-green-200 mb-4">Renda Identificada</h3>
                <div className="text-3xl font-bold text-white mb-2">
                  {result.rendaPresumida || 'R$ 5.500,00'}
                </div>
                <p className="text-green-200">Valor mensal estimado</p>
              </div>

              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-6">
                <h3 className="text-xl font-bold text-blue-200 mb-4">Confiabilidade</h3>
                <div className="text-3xl font-bold text-white mb-2">
                  {result.confiabilidade || '95%'}
                </div>
                <p className="text-blue-200">Precisão da análise</p>
              </div>
            </div>

            {result.detalhes && (
              <div className="mt-6 bg-white/5 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Detalhes da Análise</h3>
                <p className="text-blue-100">{result.detalhes}</p>
              </div>
            )}

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setFile(null);
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

export default RendaPresumida;