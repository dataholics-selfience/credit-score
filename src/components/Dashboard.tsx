import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  CreditCard, 
  TrendingUp, 
  LogOut, 
  User,
  ArrowRight,
  BarChart3,
  Shield
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-white">DATAHOLICS</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-white">
                <User size={20} />
                <span>Olá, {userData?.name || auth.currentUser?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-white hover:text-red-200 transition-colors"
              >
                <LogOut size={20} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Bem-vindo ao Hub de Crédito
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Escolha o serviço que você precisa para análise de crédito e renda
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Renda Presumida */}
          <Link
            to="/renda-presumida"
            className="group bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="text-white" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Renda Presumida</h3>
                <p className="text-green-200">Análise inteligente de renda</p>
              </div>
            </div>
            
            <p className="text-blue-100 mb-6 text-lg">
              Faça o upload do holerite e descubra qual é a renda ou salário presumido através de dados salariais da internet.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-green-400" size={20} />
                <span className="text-white">Upload simples de holerite</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="text-green-400" size={20} />
                <span className="text-white">Análise baseada em dados reais</span>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="text-green-400" size={20} />
                <span className="text-white">Resultado instantâneo</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-green-400 font-semibold">Começar Análise</span>
              <ArrowRight className="text-green-400 group-hover:translate-x-2 transition-transform" size={20} />
            </div>
          </Link>

          {/* Credit Score PJ */}
          <Link
            to="/credit-score"
            className="group bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="text-white" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Credit Score PJ</h3>
                <p className="text-purple-200">Análise completa de crédito</p>
              </div>
            </div>
            
            <p className="text-blue-100 mb-6 text-lg">
              Upload dos demonstrativos financeiros e valor do crédito para descobrir o score e formas de pagamento.
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-purple-400" size={20} />
                <span className="text-white">Análise de demonstrativos</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="text-purple-400" size={20} />
                <span className="text-white">Cálculo de score personalizado</span>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="text-purple-400" size={20} />
                <span className="text-white">Simulação de pagamento</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-purple-400 font-semibold">Começar Análise</span>
              <ArrowRight className="text-purple-400 group-hover:translate-x-2 transition-transform" size={20} />
            </div>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">99.9%</div>
            <div className="text-blue-200">Precisão</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">&lt;30s</div>
            <div className="text-blue-200">Tempo de Análise</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">24/7</div>
            <div className="text-blue-200">Disponibilidade</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;