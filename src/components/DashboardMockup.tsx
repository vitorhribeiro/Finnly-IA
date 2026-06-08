import { 
  LayoutDashboard, 
  Wallet, 
  PieChart, 
  CreditCard, 
  Settings, 
  Bell, 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Send
} from 'lucide-react';

export default function DashboardMockup() {
  return (
    <div className="w-full h-full bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(1,107,76,0.1)] border border-gray-100 flex overflow-hidden font-sans">
      
      {/* Sidebar (Hidden on small screens) */}
      <div className="hidden md:flex w-20 lg:w-64 bg-[#F8FAF9] border-r border-gray-100 p-4 lg:p-6 flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#016B4C] to-[#01A374] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-bold text-lg text-[#016B4C] hidden lg:block">Finnly</span>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          {[
            { icon: LayoutDashboard, label: 'Visão Geral', active: true },
            { icon: Wallet, label: 'Transações', active: false },
            { icon: PieChart, label: 'Metas', active: false },
            { icon: CreditCard, label: 'Cartões', active: false },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl cursor-default transition-colors ${item.active ? 'bg-[#016B4C] text-white shadow-md' : 'text-gray-500 hover:bg-white hover:text-gray-900'}`}>
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm hidden lg:block">{item.label}</span>
            </div>
          ))}
        </nav>
        
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center gap-3 p-3 text-gray-500 rounded-xl cursor-default">
            <Settings className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm hidden lg:block">Ajustes</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Header */}
        <header className="h-20 border-b border-gray-100 flex items-center justify-between px-6 lg:px-8">
          <div className="relative w-48 lg:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="w-full h-10 bg-gray-50 border-none rounded-full pl-10 pr-4 text-sm focus:ring-0 text-gray-700 pointer-events-none"
              readOnly
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
              <Bell className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-orange-300 border-2 border-white shadow-sm"></div>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Welcome & Balance */}
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-end">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Olá, Alex! 👋</h1>
              <p className="text-gray-500 text-sm">Aqui está o resumo da sua vida financeira.</p>
            </div>
            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex items-center gap-6 min-w-[280px]">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Saldo Total</p>
                <h2 className="text-2xl font-bold text-gray-900">R$ 24.785,30</h2>
              </div>
              <div className="flex items-center gap-1 bg-green-50 text-green-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                <ArrowUpRight className="w-3 h-3" />
                <span>+12%</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900">Evolução Patrimonial</h3>
                <span className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">Este ano</span>
              </div>
              <div className="flex-1 flex items-end gap-2 mt-auto h-40">
                {[40, 65, 45, 80, 55, 90, 75, 100].map((height, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end group">
                    <div 
                      className={`w-full rounded-t-md transition-all duration-500 ${i === 7 ? 'bg-[#016B4C]' : 'bg-[#016B4C]/20 group-hover:bg-[#016B4C]/40'}`} 
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* AI Assistant Chat Widget */}
            <div className="lg:col-span-1 bg-gradient-to-b from-[#F8FAF9] to-white border border-gray-100 rounded-2xl p-0 shadow-sm flex flex-col overflow-hidden relative">
              <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#016B4C] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 leading-none">Finnly IA</h4>
                  <span className="text-[10px] text-green-600 font-medium">Online agora</span>
                </div>
              </div>
              
              <div className="flex-1 p-4 flex flex-col gap-4 text-sm">
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#016B4C] shrink-0 flex items-center justify-center mt-1">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm text-gray-600 leading-relaxed text-xs">
                    Com base nos seus gastos recentes, se você investir R$ 500 hoje, atingirá sua meta da Viagem em 4 meses!
                  </div>
                </div>
                
                <div className="flex gap-2 flex-row-reverse">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-orange-400 to-orange-300 shrink-0 mt-1"></div>
                  <div className="bg-[#016B4C] text-white p-3 rounded-2xl rounded-tr-none shadow-sm leading-relaxed text-xs">
                    Ótimo! Qual o melhor fundo para isso?
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-white border-t border-gray-50 m-2 rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.02)] flex items-center gap-2">
                <input type="text" placeholder="Pergunte ao Finnly..." className="flex-1 text-xs outline-none bg-transparent text-gray-700 pointer-events-none" readOnly />
                <div className="w-8 h-8 rounded-xl bg-[#016B4C] flex items-center justify-center shrink-0">
                  <Send className="w-3 h-3 text-white ml-0.5" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
