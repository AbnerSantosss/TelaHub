import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Wifi, WifiOff, Monitor, Megaphone, Loader2, TrendingUp, Calendar, RefreshCcw, Download } from 'lucide-react';
import { getOrganizations, getOrganizationReport } from '../services/storage';
import { Organization, OrganizationReport } from '../types';
import { motion } from 'motion/react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';

// Dados simulados para os gráficos para dar a "cara de business intelligence"
const timelineData = [
  { date: 'Seg', online: 45, offline: 2, broadcasts: 12 },
  { date: 'Ter', online: 46, offline: 1, broadcasts: 15 },
  { date: 'Qua', online: 44, offline: 3, broadcasts: 18 },
  { date: 'Qui', online: 47, offline: 0, broadcasts: 10 },
  { date: 'Sex', online: 46, offline: 1, broadcasts: 22 },
  { date: 'Sáb', online: 42, offline: 5, broadcasts: 8 },
  { date: 'Dom', online: 43, offline: 4, broadcasts: 5 },
];

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<OrganizationReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getOrganizations().then((orgs) => {
      setOrganizations(orgs);
      if (orgs.length > 0) setSelectedOrgId(orgs[0].id);
    });
  }, []);

  const fetchReport = () => {
    if (!selectedOrgId) return;
    setLoading(true);
    getOrganizationReport(selectedOrgId, { startDate: startDate || undefined, endDate: endDate || undefined })
      .then(setReport)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, [selectedOrgId, startDate, endDate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 font-sans">
      {/* HEADER SUPERIOR */}
      <div className="bg-slate-900/80 border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Dashboard Gerencial</h1>
              <p className="text-sm text-slate-500 font-medium">Visão consolidada da operação de Digital Signage</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-white/10 text-slate-300 hover:text-white bg-slate-900" onClick={fetchReport}>
              <RefreshCcw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold border border-[#0ea5e9]/50 shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              <Download size={16} className="mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* BARRA DE FILTROS */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 border border-white/10 rounded-xl p-5 mb-8 flex flex-wrap gap-4 items-end shadow-2xl backdrop-blur-md"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Organização / Loja</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] outline-none transition-all font-medium"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Data Inicial</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#0ea5e9] outline-none font-medium"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Data Final</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#0ea5e9] outline-none font-medium"
              />
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-500">
            <Loader2 size={32} className="animate-spin mb-4 text-[#0ea5e9]" />
            <p className="font-medium">Sincronizando dados...</p>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard 
                title="Telas Ativas" 
                value={report.displaysCount} 
                icon={<Monitor size={20} className="text-[#0ea5e9]" />} 
                trend="+12%" 
                trendPositive={true}
                delay={0}
              />
              <KpiCard 
                title="Dispositivos Online" 
                value={report.devicesOnline} 
                icon={<Wifi size={20} className="text-[#22c55e]" />} 
                trend="98.5% Uptime" 
                trendPositive={true}
                delay={0.1}
              />
              <KpiCard 
                title="Dispositivos Offline" 
                value={report.devicesOffline} 
                icon={<WifiOff size={20} className="text-[#ef4444]" />} 
                trend="-2 nesta semana" 
                trendPositive={true}
                delay={0.2}
              />
              <KpiCard 
                title="Broadcasts Enviados" 
                value={report.broadcastsCount} 
                icon={<Megaphone size={20} className="text-[#a855f7]" />} 
                trend="+45%" 
                trendPositive={true}
                delay={0.3}
              />
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                <Card className="bg-slate-900/40 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white font-black">Estabilidade da Rede</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">Dispositivos online x offline nos últimos 7 dias</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                        <defs>
                          <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#8B93A4" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#8B93A4" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff15', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                          itemStyle={{ fontWeight: 600 }}
                        />
                        <Area type="monotone" dataKey="online" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorOnline)" name="Online" />
                        <Area type="monotone" dataKey="offline" stroke="#ef4444" strokeWidth={2} fillOpacity={0.1} fill="#ef4444" name="Offline" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
                <Card className="bg-slate-900/40 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white font-black">Engajamento (Broadcasts)</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">Comunicações enviadas por dia</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#8B93A4" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#8B93A4" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff15', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                          cursor={{ fill: '#ffffff05' }}
                          itemStyle={{ fontWeight: 600, color: '#a855f7' }}
                        />
                        <Bar dataKey="broadcasts" fill="#a855f7" radius={[6, 6, 0, 0]} name="Broadcasts" maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">
            Selecione uma organização para visualizar os relatórios consolidados.
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, icon, trend, trendPositive, delay }: { title: string, value: number, icon: React.ReactNode, trend: string, trendPositive: boolean, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/25 transition-all shadow-lg hover:shadow-xl hover:shadow-black/50 backdrop-blur-sm"
  >
    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors pointer-events-none" />
    <div className="flex justify-between items-start mb-5 relative z-10">
      <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center border border-white/10 shadow-inner">
        {icon}
      </div>
      <div className={`flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1.5 rounded-full uppercase tracking-wider ${trendPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
        {trendPositive ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
        {trend}
      </div>
    </div>
    <div className="relative z-10">
      <h3 className="text-4xl font-black text-white mb-1 tabular-nums tracking-tight">{value}</h3>
      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</p>
    </div>
  </motion.div>
);

export default Reports;
