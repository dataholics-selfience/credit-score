import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Shield, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  ArrowRight,
  Users,
  Award,
  Zap
} from 'lucide-react';

const LandingPage = () => {
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
              <Link
                to="/login"
                className="text-white hover:text-blue-200 transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                Cadastrar
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Hub de Crédito
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Inteligente
            </span>
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Soluções avançadas de análise de crédito e renda para empresas que precisam de decisões rápidas e precisas
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Começar Agora
              <ArrowRight className="inline ml-2" size={20} />
            </Link>
            <a
              href="#produtos"
              className="border-2 border-white/30 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-all"
            >
              Conhecer Produtos
            </a>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="produtos" className="py-20 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Nossos Produtos</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Duas soluções poderosas para análise de crédito e renda
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Renda Presumida */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <FileText className="text-white" size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Renda Presumida</h3>
                  <p className="text-blue-200">Análise inteligente de renda</p>
                </div>
              </div>
              
              <p className="text-blue-100 mb-6 text-lg">
                Faça o upload do holerite e descubra qual é a renda ou salário presumido da pessoa através de dados salariais da internet.
              </p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-white">Upload simples de holerite</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-white">Análise baseada em dados reais</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-white">Resultado instantâneo</span>
                </div>
              </div>
              
              <Link
                to="/register"
                className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                Experimentar Agora
              </Link>
            </div>

            {/* Credit Score PJ */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <CreditCard className="text-white" size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Credit Score PJ</h3>
                  <p className="text-blue-200">Análise completa de crédito</p>
                </div>
              </div>
              
              <p className="text-blue-100 mb-6 text-lg">
                Upload dos demonstrativos financeiros e valor do crédito para descobrir o score de crédito e formas de pagamento: entrada, prestações e juros.
              </p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-white">Análise de demonstrativos</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-white">Cálculo de score personalizado</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-white">Simulação de pagamento</span>
                </div>
              </div>
              
              <Link
                to="/register"
                className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Experimentar Agora
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Por que escolher a DATAHOLICS?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Velocidade</h3>
              <p className="text-blue-100">
                Resultados em segundos, não em dias. Nossa IA processa informações instantaneamente.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Segurança</h3>
              <p className="text-blue-100">
                Seus dados são protegidos com criptografia de ponta e conformidade total com a LGPD.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Precisão</h3>
              <p className="text-blue-100">
                Algoritmos avançados garantem análises precisas baseadas em dados reais do mercado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Pronto para revolucionar sua análise de crédito?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Junte-se a centenas de empresas que já confiam na DATAHOLICS
          </p>
          <Link
            to="/register"
            className="bg-white text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
          >
            Começar Gratuitamente
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-sm border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold text-white">DATAHOLICS</span>
            </div>
            <div className="text-blue-200">
              © 2024 DATAHOLICS. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;