import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Monitor, Edit3, Copy, Trash2, Check, RefreshCw, ExternalLink, Loader2, X, Zap, LogOut, Users as UsersIcon, Shield, Tv, Link as LinkIcon, Unplug, Calendar, FileImage, Settings, Mail, CheckCircle, XCircle, Send, AlertTriangle, KeyRound, RotateCcw, MoreVertical, Pencil, Image as ImageIcon } from 'lucide-react';
import { getDisplays, deleteDisplay, saveDisplay, getCurrentUser, logout, getUsers, saveUser, deleteUser, resendInvite, adminSendPasswordReset, getDevices, linkDevice, unlinkDevice, updateDeviceDisplay, getSmtpSettings, saveSmtpSettings, testSmtpConnection, getSmtpStatus } from '../services/storage';
import { Display, User, Device } from '../types';
import { MediaLibrary } from './MediaLibrary';
import { LogoHub } from './Login';
import { motion } from 'motion/react';

const Dashboard: React.FC = () => {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userActionLoading, setUserActionLoading] = useState(false);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  // Form States
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newDisplayOrientation, setNewDisplayOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  // Link Device Form States
  const [linkCode, setLinkCode] = useState('');
  const [linkName, setLinkName] = useState('');
  const [selectedDisplayId, setSelectedDisplayId] = useState('');

  // User Invite Form States
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');

  // SMTP Settings States
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpHasSavedPass, setSmtpHasSavedPass] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [smtpLoading, setSmtpLoading] = useState(false);

  const [isDeleteDeviceModalOpen, setIsDeleteDeviceModalOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);

  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Delete Display confirmation
  const [isDeleteDisplayModalOpen, setIsDeleteDisplayModalOpen] = useState(false);
  const [displayToDelete, setDisplayToDelete] = useState<Display | null>(null);
  const [isDeletingDisplay, setIsDeletingDisplay] = useState(false);

  // Rename Display
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [displayToRename, setDisplayToRename] = useState<Display | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Cover Image
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [displayForCover, setDisplayForCover] = useState<Display | null>(null);

  // Card dropdown menu
  const [openCardMenu, setOpenCardMenu] = useState<string | null>(null);

  // Display Settings Modal
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [settingsDisplay, setSettingsDisplay] = useState<Display | null>(null);
  const [settingsDeviceDisplayMap, setSettingsDeviceDisplayMap] = useState<Record<string, string>>({});

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);

  const navigate = useNavigate();

  const refreshData = async () => {
    setLoading(true);
    try {
      const [displaysData, devicesData, user, smtpStatus] = await Promise.all([
        getDisplays(),
        getDevices(),
        getCurrentUser(),
        getSmtpStatus(),
      ]);

      setDisplays(displaysData);
      setDevices(devicesData);
      setCurrentUser(user);
      setSmtpConfigured(smtpStatus.configured);

      // Qualquer usuário logado pode ver a lista de usuários
      const users = await getUsers();
      setUsersList(users);
    } catch (error) {
      console.error("Dashboard: Falha ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();

    // Polling para atualizar status dos dispositivos
    const interval = setInterval(async () => {
      try {
        const devicesData = await getDevices();
        setDevices(devicesData);
      } catch (error) {
        console.error("Dashboard: Falha ao recarregar dispositivos", error);
      }
    }, 30000); // A cada 30 segundos (reduzido de 15s)

    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown do card ao clicar fora
  React.useEffect(() => {
    if (!openCardMenu) return;
    const handleClickOutside = () => setOpenCardMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openCardMenu]);

  // --- Auth Handlers ---
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // --- Device Handlers ---
  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCode || !selectedDisplayId || !linkName) return;

    setLoading(true);
    try {
      const success = await linkDevice(linkCode, selectedDisplayId, linkName);
      if (success) {
        alert('Dispositivo vinculado com sucesso!');
        setIsLinkModalOpen(false);
        setLinkCode('');
        setLinkName('');
        setSelectedDisplayId('');
        await refreshData();
      } else {
        alert('Código inválido ou dispositivo não encontrado.');
      }
    } catch (error) {
      console.error("Erro ao vincular dispositivo:", error);
      alert('Erro ao vincular dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteDevice = (deviceId: string) => {
    setDeviceToDelete(deviceId);
    setIsDeleteDeviceModalOpen(true);
  };

  const executeDeleteDevice = async () => {
    if (!deviceToDelete) return;

    setLoading(true);
    try {
      await unlinkDevice(deviceToDelete);
      await refreshData();
      setIsDeleteDeviceModalOpen(false);
      setDeviceToDelete(null);
    } catch (error) {
      console.error("Erro ao desvincular:", error);
      alert("Erro ao excluir dispositivo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- Display Handlers ---
  const openCreateModal = () => {
    setNewDisplayName('');
    setNewDisplayOrientation('horizontal');
    setIsModalOpen(true);
  };

  const handleCreateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    setIsModalOpen(false);
    setLoading(true);

    try {
      // Geração de ID robusta (fallback se crypto.randomUUID não existir)
      const id = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substr(2);

      const slug = newDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

      const newDisplay: Display = {
        id,
        name: newDisplayName,
        slug,
        pages: [{ id: 'p' + Date.now(), order: 1, duration: 15, layout: [] }],
        updatedAt: Date.now(),
        orientation: newDisplayOrientation
      };

      await saveDisplay(newDisplay);
      await refreshData();
    } catch (error) {
      console.error("Dashboard: Erro ao criar tela:", error);
      alert("Erro ao criar tela. Verifique a conexão.");
      setLoading(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const display = displays.find(d => d.id === id);
    if (display) {
      setDisplayToDelete(display);
      setIsDeleteDisplayModalOpen(true);
    }
  };

  const executeDeleteDisplay = async () => {
    if (!displayToDelete) return;
    setIsDeletingDisplay(true);
    try {
      await deleteDisplay(displayToDelete.id);
      await refreshData();
      setIsDeleteDisplayModalOpen(false);
      setDisplayToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir tela:", error);
      alert("Erro ao excluir tela. Tente novamente.");
    } finally {
      setIsDeletingDisplay(false);
    }
  };

  // --- Rename Display ---
  const openRenameModal = (display: Display) => {
    setDisplayToRename(display);
    setRenameValue(display.name);
    setIsRenameModalOpen(true);
    setOpenCardMenu(null);
  };

  const handleRenameDisplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayToRename || !renameValue.trim()) return;
    setLoading(true);
    try {
      const updated: Display = { ...displayToRename, name: renameValue.trim(), updatedAt: Date.now() };
      await saveDisplay(updated);
      await refreshData();
      setIsRenameModalOpen(false);
      setDisplayToRename(null);
    } catch (error) {
      console.error('Erro ao renomear tela:', error);
      alert('Erro ao renomear tela.');
    } finally {
      setLoading(false);
    }
  };

  // --- Cover Image ---
  const openCoverModal = (display: Display) => {
    setDisplayForCover(display);
    setIsCoverModalOpen(true);
    setOpenCardMenu(null);
  };

  const handleCoverSelect = async (url: string) => {
    if (!displayForCover) return;
    setLoading(true);
    try {
      const updated: Display = { ...displayForCover, coverImage: url, updatedAt: Date.now() };
      await saveDisplay(updated);
      await refreshData();
      setIsCoverModalOpen(false);
      setDisplayForCover(null);
      // Also update settings modal if open
      if (settingsDisplay && settingsDisplay.id === displayForCover.id) {
        setSettingsDisplay({ ...updated });
      }
    } catch (error) {
      console.error('Erro ao definir capa:', error);
      alert('Erro ao definir capa.');
    } finally {
      setLoading(false);
    }
  };

  // --- Display Settings Modal ---
  const openDisplaySettings = (display: Display) => {
    setSettingsDisplay(display);
    // Pre-populate device-to-display map for devices linked to this display
    const map: Record<string, string> = {};
    devices.filter(d => d.status === 'linked' && d.display_id === display.id).forEach(d => {
      map[d.id] = d.display_id || '';
    });
    setSettingsDeviceDisplayMap(map);
    setIsDisplaySettingsOpen(true);
    setOpenCardMenu(null);
  };

  const handleDeviceDisplayChange = async (deviceId: string, newDisplayId: string) => {
    try {
      await updateDeviceDisplay(deviceId, newDisplayId);
      await refreshData();
      // Update local map
      setSettingsDeviceDisplayMap(prev => ({ ...prev, [deviceId]: newDisplayId }));
    } catch (error) {
      console.error('Erro ao reatribuir dispositivo:', error);
      alert('Erro ao alterar a tela do dispositivo.');
    }
  };

  const handleRemoveCover = async (display?: Display) => {
    const target = display || displayForCover;
    if (!target) return;
    setLoading(true);
    try {
      const updated: Display = { ...target, coverImage: '', updatedAt: Date.now() };
      await saveDisplay(updated);
      await refreshData();
      setIsCoverModalOpen(false);
      setDisplayForCover(null);
      // Also update settings modal if open
      if (settingsDisplay && settingsDisplay.id === target.id) {
        setSettingsDisplay({ ...updated });
      }
    } catch (error) {
      console.error('Erro ao remover capa:', error);
      alert('Erro ao remover capa.');
    } finally {
      setLoading(false);
    }
  };

  // --- User Handlers ---
  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({ type, title, message });
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      showToast('error', 'E-mail inválido', 'Informe um e-mail válido para enviar o convite.');
      return;
    }

    setUserActionLoading(true);
    try {
      const result = await saveUser(inviteEmail.trim(), inviteRole);

      const updatedUsers = await getUsers();
      setUsersList(updatedUsers);

      const savedEmail = inviteEmail.trim();
      setInviteEmail('');
      setInviteRole('user');
      showToast('success', 'Convite enviado! ✉️', `As credenciais de acesso foram enviadas com sucesso para ${savedEmail}`);
    } catch (err: any) {
      showToast('error', 'Falha ao enviar convite', err.message || 'Erro desconhecido. Tente novamente.');
    } finally {
      setUserActionLoading(false);
    }
  };

  const confirmDeleteUser = (u: User) => {
    setUserToDelete(u);
    setIsDeleteUserModalOpen(true);
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    setUserActionLoading(true);
    try {
      await deleteUser(userToDelete.id);
      const updatedUsers = await getUsers();
      setUsersList(updatedUsers);
      setIsDeleteUserModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir o usuário.');
    } finally {
      setUserActionLoading(false);
    }
  };

  // --- Settings Handlers ---
  const openSettingsModal = async () => {
    setIsSettingsModalOpen(true);
    setSmtpLoading(true);
    setSmtpTestResult(null);
    try {
      const cfg = await getSmtpSettings();
      setSmtpUser(cfg.smtp_user || '');
      // Se a senha está mascarada, significa que já foi salva
      if (cfg.smtp_pass === '••••••••') {
        setSmtpPass('');
        setSmtpHasSavedPass(true);
      } else {
        setSmtpPass(cfg.smtp_pass || '');
        setSmtpHasSavedPass(false);
      }
    } catch {
      // Ignora
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    // Se já tem senha salva e não digitou nova, só precisa do email
    if (!smtpUser) {
      alert('Preencha o e-mail.');
      return;
    }
    if (!smtpPass && !smtpHasSavedPass) {
      alert('Preencha a senha de aplicativo.');
      return;
    }
    setSmtpLoading(true);
    try {
      // Se o campo de senha está vazio mas já tinha senha salva, envia flag especial
      const passToSend = smtpPass || (smtpHasSavedPass ? '__KEEP_CURRENT__' : '');
      await saveSmtpSettings(smtpUser.trim(), passToSend);
      setSmtpTestResult(null);
      alert('Configurações SMTP salvas com sucesso!');
      setSmtpConfigured(true);
      setSmtpHasSavedPass(true);
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpLoading(true);
    setSmtpTestResult(null);
    try {
      const result = await testSmtpConnection();
      setSmtpTestResult({ ok: result.ok, message: result.ok ? (result.message || 'Conexão OK!') : (result.error || 'Falhou.') });
      if (result.ok) setSmtpConfigured(true);
    } catch (err: any) {
      setSmtpTestResult({ ok: false, message: err.message });
    } finally {
      setSmtpLoading(false);
    }
  };

  const getPlayerUrl = (slug: string) => {
    return `${window.location.origin}${window.location.pathname}#/player/${slug}`;
  };

  const copyPlayerLink = async (slug: string, id: string) => {
    const url = getPlayerUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Fallback para navegadores sem permissão de clipboard
      prompt("Copie o link abaixo:", url);
    }
  };

  const openPlayer = (slug: string) => {
    window.open(getPlayerUrl(slug), '_blank');
  };

  return (
    <div className="min-h-screen bg-[#1C1D22] text-[#F3F4F6]">
      <div className="p-4 md:p-8 max-w-7xl mx-auto relative min-h-screen">

      {/* TOAST NOTIFICATION MODAL */}
      {toast && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`bg-[#2D3139] border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300 ${
            toast.type === 'success' ? 'border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.2)]' :
            toast.type === 'error' ? 'border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.2)]' :
            'border-[#7C3AED]/40 shadow-[0_0_50px_rgba(124,58,237,0.2)]'
          }`}>
            {/* Top violet/accent gradient bar */}
            <div className={`h-1 ${
              toast.type === 'success' ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-400' :
              toast.type === 'error' ? 'bg-gradient-to-r from-rose-600 via-rose-400 to-amber-400' :
              'bg-[#7C3AED]'
            }`}></div>
            
            <div className="p-6 text-center">
              {/* Icon */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                toast.type === 'error' ? 'bg-rose-500/10 text-rose-400' :
                'bg-[#7C3AED]/10 text-[#7C3AED]'
              }`}>
                {toast.type === 'success' ? <CheckCircle size={28} /> :
                 toast.type === 'error' ? <XCircle size={28} /> :
                 <AlertTriangle size={28} />}
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-bold text-white mb-2">{toast.title}</h3>
              
              {/* Message */}
              <p className="text-sm text-slate-400 leading-relaxed mb-6">{toast.message}</p>
              
              {/* Button */}
              <button
                onClick={() => setToast(null)}
                className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  toast.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
                  toast.type === 'error' ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' :
                  'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
      </div>

      {/* MODAL CRIAR TELA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2D3139] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2D3139]/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Plus className="text-[#7C3AED]" size={20} /> Nova Tela
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateConfirm} className="p-6">
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Nome do Dispositivo</label>
              <input
                autoFocus
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Ex: Recepção, Vitrine..."
                className="w-full bg-[#1C1D22] border border-white/10 rounded-xl p-3 text-slate-100 placeholder:text-slate-600 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all font-medium"
              />

              {/* Orientation Selector */}
              <label className="block text-sm font-bold text-slate-400 mt-6 mb-3 uppercase tracking-wider">Orientação da Tela</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewDisplayOrientation('horizontal')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    newDisplayOrientation === 'horizontal'
                      ? 'border-[#7C3AED] bg-[#7C3AED]/10 shadow-[0_0_16px_rgba(124,58,237,0.2)]'
                      : 'border-white/10 bg-[#1C1D22] hover:border-[#9CA3AF]/40'
                  }`}
                >
                  {/* 16:9 preview */}
                  <div className={`w-16 h-9 rounded border-2 flex items-center justify-center transition-colors ${
                    newDisplayOrientation === 'horizontal' ? 'border-[#7C3AED]/80 bg-[#7C3AED]/10' : 'border-white/10 bg-[#2D3139]'
                  }`}>
                    <Monitor size={14} className={newDisplayOrientation === 'horizontal' ? 'text-[#7C3AED]' : 'text-slate-500'} />
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-bold ${ newDisplayOrientation === 'horizontal' ? 'text-[#7C3AED]' : 'text-slate-400' }`}>Horizontal</p>
                    <p className="text-[10px] text-slate-600 font-mono">16:9 — TV / Monitor</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNewDisplayOrientation('vertical')}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    newDisplayOrientation === 'vertical'
                      ? 'border-[#7C3AED] bg-[#7C3AED]/10 shadow-lg'
                      : 'border-white/10 bg-[#1C1D22] hover:border-[#9CA3AF]/40'
                  }`}
                >
                  {/* 9:16 preview */}
                  <div className={`w-9 h-16 rounded border-2 flex items-center justify-center transition-colors ${
                    newDisplayOrientation === 'vertical' ? 'border-[#7C3AED]/80 bg-[#7C3AED]/10' : 'border-white/10 bg-[#2D3139]'
                  }`}>
                    <Tv size={14} className={newDisplayOrientation === 'vertical' ? 'text-[#7C3AED]' : 'text-slate-500'} />
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-bold ${ newDisplayOrientation === 'vertical' ? 'text-[#7C3AED]' : 'text-slate-400' }`}>Vertical</p>
                    <p className="text-[10px] text-slate-600 font-mono">9:16 — Totem / Kiosk</p>
                  </div>
                </button>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-slate-400 font-bold hover:bg-[#1C1D22] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold shadow-lg transition-all flex items-center gap-2"
                >
                  <Zap size={18} className="fill-white" /> Criar Tela
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GERENCIAR USUÁRIOS */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2D3139] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2D3139]/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <UsersIcon className="text-emerald-400" size={20} /> Gestão de Usuários
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* Formulário Convidar Usuário */}
              {!smtpConfigured && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-amber-300 text-sm font-bold">Envio de e-mail não configurado</p>
                      <p className="text-amber-400/70 text-xs mt-1 leading-relaxed">
                        {currentUser?.role === 'admin'
                          ? 'Configure as credenciais SMTP para habilitar o envio de convites automáticos aos novos usuários.'
                          : 'Peça a um administrador para configurar o provedor de e-mail SMTP.'}
                      </p>
                    </div>
                  </div>
                  {currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserModalOpen(false);
                        openSettingsModal();
                      }}
                      className="shrink-0 flex items-center gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md mt-2 sm:mt-0"
                    >
                      <Settings size={14} /> Configurar SMTP
                    </button>
                  )}
                </div>
              )}
              <form onSubmit={handleInviteUser} className="bg-[#1C1D22]/50 p-4 rounded-xl border border-white/10 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">E-mail do Novo Usuário</label>
                    <input type="email" placeholder="Ex: joao@empresa.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full bg-[#1C1D22] border border-white/10 rounded-lg p-2 text-sm text-white placeholder:text-slate-600 focus:border-[#7C3AED] outline-none" disabled={!smtpConfigured} />
                  </div>
                  <div className="w-full md:w-40">
                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Permissão</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'user' | 'admin')} className="w-full bg-[#1C1D22] border border-white/10 rounded-lg p-2 text-sm text-white appearance-none cursor-pointer focus:border-[#7C3AED] outline-none" disabled={!smtpConfigured}>
                      <option value="user">Usuário</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button disabled={userActionLoading || !smtpConfigured} type="submit" className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg text-sm w-full md:w-auto flex items-center justify-center gap-2 whitespace-nowrap">
                    {userActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar Convite
                  </button>
                </div>
                {smtpConfigured && <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1"><Mail size={10} /> A senha será gerada automaticamente e enviada por e-mail.</p>}
              </form>

              {/* Lista de Usuários */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-500 uppercase mb-2">Usuários Cadastrados</h4>
                {usersList.length === 0 && <p className="text-slate-600 text-xs">Carregando usuários...</p>}
                {usersList.map(u => {
                  const hasLoggedIn = !!u.lastLogin;
                  const isSelf = u.id === currentUser?.id;
                  const isAdmin = currentUser?.role === 'admin';
                  return (
                    <div key={u.id} className="p-3 bg-[#1C1D22]/30 rounded-xl border border-white/10 hover:border-[#9CA3AF]/30 transition-all">
                      {/* Linha principal: avatar + info + badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${u.role === 'admin' ? 'bg-[#7C3AED] text-white' : 'bg-slate-700 text-slate-300'}`}>
                            {u.role === 'admin' ? 'A' : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-sm text-slate-200 truncate">{u.email || u.username}</p>
                              {hasLoggedIn ? (
                                <span title="Já acessou o sistema" className="flex items-center gap-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20 flex-shrink-0">
                                  <CheckCircle size={10} /> Verificado
                                </span>
                              ) : (
                                <span title="Nunca acessou" className="flex items-center gap-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/20 flex-shrink-0">
                                  <AlertTriangle size={10} /> Pendente
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {u.role === 'admin' ? 'Administrador' : 'Usuário'}
                              {hasLoggedIn && u.lastLogin && <span className="ml-1 text-slate-600">· Último acesso: {new Date(u.lastLogin).toLocaleDateString('pt-BR')}</span>}
                            </p>
                          </div>
                        </div>
                        {isSelf && <span className="text-[9px] text-[#7C3AED] font-bold px-2 py-0.5 bg-[#7C3AED]/10 rounded-full border border-[#7C3AED]/20 flex-shrink-0">Você</span>}
                      </div>

                      {/* Ações — visíveis para admin, exceto no próprio usuário */}
                      {isAdmin && !isSelf && (
                        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-white/5">
                          {!hasLoggedIn ? (
                            <button
                              onClick={async () => { try { await resendInvite(u.id); alert('Convite reenviado! Uma nova senha foi gerada e enviada por e-mail.'); } catch (e: any) { alert('Erro: ' + e.message); } }}
                              disabled={userActionLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#7C3AED] bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 rounded-lg border border-[#7C3AED]/20 transition-all disabled:opacity-50"
                            >
                              <RotateCcw size={12} /> Reenviar Convite
                            </button>
                          ) : (
                            <button
                              onClick={async () => { try { await adminSendPasswordReset(u.id); alert('Email de redefinição de senha enviado com sucesso!'); } catch (e: any) { alert('Erro: ' + e.message); } }}
                              disabled={userActionLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 transition-all disabled:opacity-50"
                            >
                              <KeyRound size={12} /> Redefinir Senha
                            </button>
                          )}
                          <button
                            onClick={() => confirmDeleteUser(u)}
                            disabled={userActionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 transition-all disabled:opacity-50 ml-auto"
                          >
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÕES SMTP (ADMIN ONLY) */}
      {isSettingsModalOpen && currentUser?.role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2D3139] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2D3139]/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Settings className="text-[#7C3AED]" size={20} /> Configurações de E-mail
              </h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSmtp} className="p-6 space-y-4">
               {/* Guia Passo a Passo de Configuração */}
              <div className="bg-[#1C1D22]/60 border border-white/5 rounded-xl p-4.5 space-y-3 mb-2">
                <p className="text-[10px] text-[#7C3AED] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Mail size={12} className="text-[#7C3AED]" /> Guia de Configuração (Gmail SMTP)
                </p>
                
                <ol className="space-y-2.5 text-[11px] text-slate-400 list-decimal list-inside pl-1 leading-relaxed">
                  <li>
                    Ative a <span className="text-slate-200 font-bold">Verificação em 2 Etapas</span> na sua Conta Google.
                  </li>
                  <li>
                    Acesse <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline font-semibold inline-flex items-center gap-0.5">myaccount.google.com/apppasswords <ExternalLink size={10} /></a>.
                  </li>
                  <li>
                    Insira um nome identificador (ex: <code className="text-slate-300 bg-black/40 px-1 py-0.5 rounded font-mono text-[10px]">TelaHub</code>) e clique em <span className="text-slate-200 font-medium">Criar</span>.
                  </li>
                  <li>
                    Copie a senha de <span className="text-emerald-400 font-bold">16 dígitos</span> gerada e insira no campo "Senha de Aplicativo" abaixo.
                  </li>
                </ol>

                <p className="text-[9px] text-slate-500 italic mt-2 leading-relaxed">
                  *O envio utiliza criptografia TLS na porta padrão 587.
                </p>
              </div>

              {/* Informação Custo Zero */}
              <div className="bg-[#10B981]/5 border border-[#10B981]/25 rounded-xl p-3.5 flex items-start gap-3">
                <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-emerald-400 text-xs font-black uppercase tracking-wider">Conexão Direta (Custo Zero)</p>
                  <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                    Ao conectar seu próprio e-mail SMTP, você realiza disparos de convites e alertas de redefinição de forma <span className="text-[#10B981] font-bold">100% gratuita</span>, sem taxas de entrega ou custos mensais de e-mail marketing.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">E-mail de Envio</label>
                <input
                  type="email"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="seuenvio@gmail.com"
                  className="w-full bg-[#1C1D22] border border-white/10 rounded-xl p-3 text-slate-100 placeholder:text-slate-600 focus:border-[#7C3AED] outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">Senha de Aplicativo</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder={smtpHasSavedPass ? '(senha salva — deixe vazio para manter)' : 'xxxx xxxx xxxx xxxx'}
                  className="w-full bg-[#1C1D22] border border-white/10 rounded-xl p-3 text-slate-100 placeholder:text-slate-600 focus:border-[#7C3AED] outline-none transition-all text-sm font-mono tracking-wider"
                />
              </div>

              {/* Resultado do teste */}
              {smtpTestResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-bold ${smtpTestResult.ok
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                  {smtpTestResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {smtpTestResult.message}
                </div>
              )}

              <div className="flex gap-3 justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={smtpLoading || !smtpUser || (!smtpPass && !smtpHasSavedPass)}
                  className="px-4 py-2.5 rounded-lg bg-[#1C1D22] hover:bg-slate-800 text-slate-300 font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                  {smtpLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Testar Conexão
                </button>
                <button
                  type="submit"
                  disabled={smtpLoading || !smtpUser || (!smtpPass && !smtpHasSavedPass)}
                  className="px-6 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={14} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR DISPOSITIVO */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2D3139] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2D3139]/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <LinkIcon className="text-[#7C3AED]" size={20} /> Vincular TV
              </h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleLinkDevice} className="p-6 space-y-4">

              <div className="bg-[#1C1D22]/50 border border-white/10 rounded-lg p-3 mb-4">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                  <Monitor size={10} /> Instrução
                </p>
                <p className="text-xs text-slate-300 mb-2">Abra este link no navegador da sua TV:</p>
                <div className="bg-black/50 p-2 rounded border border-white/10 font-mono text-[10px] text-[#7C3AED] break-all select-all cursor-pointer hover:bg-black/70 transition-colors" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/player`)}>
                  {window.location.origin}{window.location.pathname}#/player
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Código de Pareamento</label>
                <input
                  autoFocus
                  type="text"
                  maxLength={6}
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-[#1C1D22] border border-white/10 rounded-xl p-3 text-center text-2xl tracking-[0.5em] font-mono text-[#7C3AED] placeholder:text-slate-800 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-1 text-center">Digite o código exibido na TV</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nome do Dispositivo</label>
                <input
                  type="text"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="Ex: TV Recepção"
                  className="w-full bg-[#1C1D22] border border-white/10 rounded-xl p-3 text-slate-100 placeholder:text-slate-600 focus:border-[#7C3AED] outline-none transition-all font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Selecionar Tela</label>
                <select
                  value={selectedDisplayId}
                  onChange={(e) => setSelectedDisplayId(e.target.value)}
                  className="w-full bg-[#1C1D22] border border-white/10 rounded-xl p-3 text-slate-100 focus:border-[#7C3AED] outline-none transition-all font-medium text-sm appearance-none cursor-pointer"
                >
                  <option value="" disabled>Selecione um conteúdo...</option>
                  {displays.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="mt-8 flex gap-3 justify-end pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-slate-400 font-bold hover:bg-[#1C1D22] transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!linkCode || !linkName || !selectedDisplayId}
                  className="px-6 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LinkIcon size={16} /> Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO EXCLUSÃO DISPOSITIVO */}
      {isDeleteDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2D3139] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2D3139]/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Trash2 className="text-rose-500" size={20} /> Excluir Dispositivo?
              </h3>
              <button onClick={() => setIsDeleteDeviceModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Tem certeza que deseja remover este dispositivo? Ele perderá a conexão com a tela atual.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsDeleteDeviceModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-slate-400 font-bold hover:bg-[#1C1D22] transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteDevice}
                  className="px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg transition-all flex items-center gap-2 text-sm"
                >
                  <Trash2 size={16} /> Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO EXCLUSÃO USUÁRIO */}
      {isDeleteUserModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#2D3139] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2D3139]/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Trash2 className="text-rose-500" size={20} /> Excluir Usuário?
              </h3>
              <button onClick={() => setIsDeleteUserModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-300 text-sm mb-2 leading-relaxed">
                Tem certeza que deseja excluir <strong>{userToDelete?.email || userToDelete?.username}</strong>?
              </p>
              <p className="text-rose-400/80 text-xs mb-6 font-medium">
                (O usuário perderá o acesso ao painel permanentemente)
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsDeleteUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-slate-400 font-bold hover:bg-[#1C1D22] transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteUser}
                  disabled={userActionLoading}
                  className="px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {userActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} 
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO EXCLUSÃO TELA (DISPLAY) */}
      {isDeleteDisplayModalOpen && displayToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#2D3139] border border-rose-500/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Top warning bar */}
            <div className="h-1.5 bg-gradient-to-r from-rose-600 via-red-500 to-amber-500"></div>
            
            <div className="p-6 text-center">
              {/* Danger Icon */}
              <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-5 border-2 border-rose-500/30">
                <AlertTriangle size={32} className="text-rose-500" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-black text-white mb-3">Excluir Tela Permanentemente?</h3>
              
              {/* Display name badge */}
              <div className="bg-[#1C1D22] border border-white/10 rounded-xl px-4 py-3 mb-4 inline-block">
                <div className="flex items-center gap-2 text-sm">
                  <Monitor size={16} className="text-[#7C3AED]" />
                  <span className="font-bold text-white">{displayToDelete.name}</span>
                </div>
              </div>
              
              {/* Warning message */}
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 mb-6 text-left">
                <p className="text-rose-300 text-sm font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} /> Atenção: esta ação é irreversível!
                </p>
                <ul className="text-slate-400 text-xs space-y-1.5 ml-5 list-disc">
                  <li>Todas as <strong className="text-white">cenas</strong> desta tela serão removidas</li>
                  <li>Todos os <strong className="text-white">widgets e configurações</strong> serão perdidos</li>
                  <li>Dispositivos vinculados a esta tela ficarão <strong className="text-white">sem conteúdo</strong></li>
                  <li>Esta ação <strong className="text-rose-400">NÃO pode ser desfeita</strong></li>
                </ul>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setIsDeleteDisplayModalOpen(false); setDisplayToDelete(null); }}
                  disabled={isDeletingDisplay}
                  className="px-6 py-3 rounded-xl text-slate-300 font-bold hover:bg-[#1C1D22] transition-colors text-sm border border-white/10 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteDisplay}
                  disabled={isDeletingDisplay}
                  className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50 border border-rose-500"
                >
                  {isDeletingDisplay ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {isDeletingDisplay ? 'Excluindo...' : 'Sim, Excluir Tela'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RENOMEAR TELA */}
      {isRenameModalOpen && displayToRename && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#2D3139] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2D3139]/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Pencil className="text-[#7C3AED]" size={20} /> Renomear Tela
              </h3>
              <button onClick={() => { setIsRenameModalOpen(false); setDisplayToRename(null); }} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRenameDisplay} className="p-6">
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Novo Nome</label>
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Ex: Recepção, Vitrine..."
                className="w-full bg-[#1C1D22] border border-white/10 rounded-xl p-3 text-slate-100 placeholder:text-slate-600 focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none transition-all font-medium"
              />
              <div className="mt-8 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setIsRenameModalOpen(false); setDisplayToRename(null); }}
                  className="px-4 py-2.5 rounded-lg text-slate-400 font-bold hover:bg-[#1C1D22] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim() || renameValue.trim() === displayToRename.name}
                  className="px-6 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={16} /> Salvar Nome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ALTERAR CAPA */}
      {isCoverModalOpen && displayForCover && (
        <MediaLibrary
          onClose={() => { setIsCoverModalOpen(false); setDisplayForCover(null); }}
          onSelect={(url) => handleCoverSelect(url)}
          allowedTypes="image"
        />
      )}

      {/* MODAL CONFIGURAÇÕES DO DISPLAY */}
      {isDisplaySettingsOpen && settingsDisplay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#2D3139] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2D3139]/50">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <Settings className="text-[#7C3AED]" size={20} /> Configurações — {settingsDisplay.name}
              </h3>
              <button onClick={() => { setIsDisplaySettingsOpen(false); setSettingsDisplay(null); }} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Seção: Imagem de Capa */}
              <div>
                <h4 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ImageIcon size={12} /> Imagem de Capa
                </h4>
                <div className="bg-[#1C1D22] border border-white/10 rounded-xl overflow-hidden">
                  {settingsDisplay.coverImage ? (
                    <div className="relative group">
                      <img src={settingsDisplay.coverImage} alt="Capa" className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          onClick={() => { setIsDisplaySettingsOpen(false); openCoverModal(settingsDisplay); }}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-white/20"
                        >
                          <ImageIcon size={14} /> Trocar
                        </button>
                        <button
                          onClick={() => handleRemoveCover(settingsDisplay)}
                          className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 backdrop-blur-sm text-rose-300 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-rose-500/30"
                        >
                          <X size={14} /> Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-36 flex flex-col items-center justify-center gap-3 text-slate-500">
                      <Monitor size={32} className="text-[#9CA3AF]/40" />
                      <button
                        onClick={() => { setIsDisplaySettingsOpen(false); openCoverModal(settingsDisplay); }}
                        className="px-4 py-2 bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#7C3AED] rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-[#7C3AED]/30"
                      >
                        <ImageIcon size={14} /> Adicionar Capa
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção: TVs Vinculadas */}
              <div>
                <h4 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Tv size={12} /> TVs Vinculadas a este Display
                </h4>
                {(() => {
                  const linkedDevices = devices.filter(d => d.status === 'linked' && d.display_id === settingsDisplay.id);
                  if (linkedDevices.length === 0) {
                    return (
                      <div className="text-center py-6 border border-dashed border-white/10 rounded-xl text-slate-500">
                        <Tv size={24} className="mx-auto mb-2 text-slate-700" />
                        <p className="text-xs">Nenhuma TV vinculada a este display.</p>
                        <p className="text-[10px] text-slate-600 mt-1">Use o botão "Vincular TV" no painel principal.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {linkedDevices.map(device => {
                        const isOnline = (Date.now() - device.last_seen) < 60000;
                        return (
                          <div key={device.id} className="bg-[#1C1D22] border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[#64748B]'}`}></div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-white truncate">{device.name || 'Sem nome'}</p>
                                <p className="text-[10px] text-slate-500">{isOnline ? 'Online agora' : 'Offline'}</p>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Exibindo Conteúdo de:</label>
                              <select
                                value={settingsDeviceDisplayMap[device.id] || device.display_id || ''}
                                onChange={(e) => handleDeviceDisplayChange(device.id, e.target.value)}
                                className="w-full bg-[#2D3139] border border-white/10 rounded-lg p-2.5 text-sm text-white appearance-none cursor-pointer focus:border-[#7C3AED] outline-none transition-all"
                              >
                                {displays.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Seção: Renomear */}
              <div>
                <h4 className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Pencil size={12} /> Renomear
                </h4>
                <button
                  onClick={() => { setIsDisplaySettingsOpen(false); openRenameModal(settingsDisplay); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1C1D22] hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-[#7C3AED]/50 rounded-xl text-sm font-bold transition-all"
                >
                  <Pencil size={14} /> Renomear Display
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMediaLibraryOpen && (
        <MediaLibrary onClose={() => setIsMediaLibraryOpen(false)} />
      )}

      {/* HEADER (Transparent navigation bar with backdrop blur) */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col mb-12 relative z-10 bg-[#2D3139]/85 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Top Bar: Brand Identity & Direct Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-6 gap-5 border-b border-white/5">
          <div className="flex items-center gap-4 flex-shrink-0">
            <LogoHub size={44} className="drop-shadow-[0_0_12px_rgba(124,58,237,0.3)] flex-shrink-0" />
            <div className="flex-shrink-0">
              <h1 className="text-3xl font-black text-[#F3F4F6] tracking-tight uppercase leading-none">
                Tela<span className="text-[#7C3AED]">Hub</span>
              </h1>
              <p className="text-[#9CA3AF] text-xs mt-1.5 font-medium flex items-center gap-1.5 whitespace-nowrap">
                Bem-vindo, <span className="text-white font-bold">{currentUser?.username || '...'}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
            <button
              onClick={() => setIsLinkModalOpen(true)}
              className="flex items-center gap-2 bg-[#1C1D22] border border-[#7C3AED]/30 text-[#7C3AED] hover:bg-[#7C3AED]/10 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
            >
              <Tv size={15} /> <span>Vincular TV</span>
            </button>

            <button
              onClick={openCreateModal}
              disabled={loading}
              className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <Plus size={18} strokeWidth={3} className="text-white" /> <span>Nova Tela</span>
            </button>

            <div className="h-6 w-px bg-white/10 mx-1 hidden lg:block"></div>

            <button
              onClick={() => refreshData()}
              className="flex items-center justify-center w-10 h-10 bg-[#1C1D22] hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-slate-500 rounded-xl transition-all"
              title="Atualizar lista"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-[#7C3AED]' : ''} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-10 h-10 bg-[#1C1D22] hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Bottom Bar: System Navigation & Administrative Modules */}
        <div className="bg-[#1C1D22]/40 px-6 py-3 flex gap-2 overflow-x-auto scrollbar-none items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2.5 hidden md:inline">Módulos:</span>
          
          <button
            onClick={() => navigate('/scheduler')}
            className="flex items-center gap-2 bg-[#1C1D22] border border-indigo-500/20 hover:border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10 px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
          >
            <Calendar size={14} /> <span>Central de Programação</span>
          </button>

          <button
            onClick={() => setIsMediaLibraryOpen(true)}
            className="flex items-center gap-2 bg-[#1C1D22] border border-fuchsia-500/20 hover:border-fuchsia-500/50 text-fuchsia-300 hover:bg-fuchsia-500/10 px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
          >
            <FileImage size={14} /> <span>Mídia</span>
          </button>

          <button
            onClick={() => setIsUserModalOpen(true)}
            className="flex items-center gap-2 bg-[#1C1D22] border border-emerald-500/20 hover:border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
          >
            <UsersIcon size={14} /> <span>Usuários</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={openSettingsModal}
              className="flex items-center gap-2 bg-[#1C1D22] border border-[#7C3AED]/20 hover:border-[#7C3AED]/50 text-[#7C3AED] hover:bg-[#7C3AED]/10 px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
            >
              <Settings size={14} /> <span>Config. E-mail</span>
            </button>
          )}
        </div>
      </motion.header>

      {/* LISTA DE TELAS */}
      {loading && displays.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-[#9CA3AF] relative z-10">
          <div className="flex items-center gap-1.5 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] dot-matrix-dot"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] dot-matrix-dot"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] dot-matrix-dot"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] dot-matrix-dot"></div>
          </div>
          <p className="tracking-widest uppercase text-xs font-black text-[#7C3AED]">Sincronizando Dados...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {displays.map(display => (
            <div key={display.id} className="bg-[#2D3139] border border-white/10 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:border-[#7C3AED]/30 transition-all group relative">
              <div className="absolute inset-0 bg-[#7C3AED]/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>

              {/* 3-dot menu (top-right) */}
              <div className="absolute top-3 right-3 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenCardMenu(openCardMenu === display.id ? null : display.id); }}
                  className="p-2 bg-[#1C1D22]/80 rounded-full text-[#9CA3AF] hover:text-white hover:bg-[#2D3139] transition-all backdrop-blur-sm border border-white/10 hover:border-white/30 shadow-lg"
                  title="Opções"
                >
                  <MoreVertical size={16} />
                </button>
                {/* Dropdown menu */}
                {openCardMenu === display.id && (
                  <div className="absolute top-10 right-0 w-48 bg-[#2D3139] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 py-1 z-30">
                    <button
                      onClick={(e) => { e.stopPropagation(); openRenameModal(display); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-[#1C1D22] hover:text-white transition-colors text-left"
                    >
                      <Pencil size={14} className="text-[#7C3AED]" /> Renomear
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openCoverModal(display); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-[#1C1D22] hover:text-white transition-colors text-left"
                    >
                      <ImageIcon size={14} className="text-fuchsia-400" /> Alterar Capa
                    </button>
                    {display.coverImage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenCardMenu(null); handleRemoveCover(display); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 transition-colors text-left"
                      >
                        <X size={14} /> Remover Capa
                      </button>
                    )}
                    <div className="border-t border-white/5 my-1"></div>
                    <button
                      onClick={(e) => handleDelete(display.id, e)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
                    >
                      <Trash2 size={14} /> Excluir Tela
                    </button>
                  </div>
                )}
              </div>

              {/* Cover / Thumbnail area */}
              <div className="h-40 bg-[#1C1D22] flex items-center justify-center border-b border-white/10 relative group-hover:bg-[#1C1D22]/80 transition-colors overflow-hidden">
                {display.coverImage ? (
                  <img src={display.coverImage} alt={display.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    {display.orientation === 'vertical' ? (
                      <div className="w-[84px] h-[130px] rounded-xl border-2 border-white/5 bg-[#1C1D22] group-hover:border-[#7C3AED]/50 group-hover:shadow-lg transition-all flex flex-col items-center justify-between p-2">
                        {/* Notch */}
                        <div className="w-8 h-1 bg-slate-800 rounded-full group-hover:bg-[#7C3AED]/30 transition-all"></div>
                        {/* Content */}
                        <div className="flex-1 w-full my-1.5 rounded-lg bg-[#2D3139]/60 border border-white/5 flex items-center justify-center group-hover:bg-[#7C3AED]/5 group-hover:border-[#7C3AED]/20 transition-all">
                          <Tv size={28} className="text-[#9CA3AF]/40 group-hover:text-[#7C3AED] transition-all" />
                        </div>
                        {/* Indicator */}
                        <div className="w-2 h-2 rounded-full bg-slate-800 group-hover:bg-[#7C3AED]/40 transition-all"></div>
                      </div>
                    ) : (
                      <div className="w-[130px] h-[84px] rounded-xl border-2 border-white/5 bg-[#1C1D22] group-hover:border-[#7C3AED]/50 group-hover:shadow-lg transition-all flex flex-col items-center justify-between p-2">
                        {/* Content */}
                        <div className="flex-1 w-full mb-1.5 rounded-lg bg-[#2D3139]/60 border border-white/5 flex items-center justify-center group-hover:bg-[#7C3AED]/5 group-hover:border-[#7C3AED]/20 transition-all">
                          <Monitor size={32} className="text-[#9CA3AF]/40 group-hover:text-[#7C3AED] transition-all" />
                        </div>
                        {/* Stand Base */}
                        <div className="w-12 h-1 bg-slate-800 rounded-full group-hover:bg-[#7C3AED]/40 transition-all"></div>
                      </div>
                    )}
                  </div>
                )}

                <div className="absolute top-4 left-4 flex gap-2">
                  {devices.filter(d => d.display_id === display.id).some(d => (Date.now() - d.last_seen) < 60000) ? (
                    <div className="bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></div> ONLINE
                    </div>
                  ) : (
                    <div className="bg-[#64748B]/15 border border-[#64748B]/30 text-[#64748B] text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#64748B]"></div> OFFLINE
                    </div>
                  )}
                </div>

                {/* Gear settings icon (top-left, below status) */}
                <button
                  onClick={(e) => { e.stopPropagation(); openDisplaySettings(display); }}
                  className="absolute bottom-3 left-3 z-20 p-2 bg-[#1C1D22]/80 rounded-full text-[#9CA3AF] hover:text-[#7C3AED] hover:bg-[#2D3139] transition-all backdrop-blur-sm border border-white/10 hover:border-[#7C3AED]/50 shadow-lg opacity-0 group-hover:opacity-100"
                  title="Configurações do Display"
                >
                  <Settings size={16} />
                </button>
              </div>

              <div className="p-6 relative">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-[#7C3AED] transition-colors">{display.name}</h3>
                  {display.orientation === 'vertical' ? (
                    <span className="flex items-center gap-1 bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#7C3AED] text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-1">
                      <Tv size={10} /> 9:16
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#7C3AED] text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-1">
                      <Monitor size={10} /> 16:9
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#9CA3AF] mb-6 font-mono truncate uppercase tracking-wider">ID: {display.slug}</p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate(`/edit/${display.id}`)}
                    className="w-full flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl"
                  >
                    <Edit3 size={16} /> Abrir Designer
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => copyPlayerLink(display.slug, display.id)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${copiedId === display.id
                          ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          : 'bg-transparent text-white border border-[#9CA3AF]/40 hover:border-white hover:bg-white/5'
                        }`}
                    >
                      {copiedId === display.id ? <Check size={14} /> : <Copy size={14} />}
                      {copiedId === display.id ? 'Copiado!' : 'Copiar URL'}
                    </button>
                    <button
                      onClick={() => openPlayer(display.slug)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-transparent text-white border border-[#9CA3AF]/40 hover:border-white hover:bg-white/5 rounded-xl text-xs font-bold transition-all"
                    >
                      <ExternalLink size={14} /> Visualizar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {displays.length === 0 && !loading && (
            <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl bg-[#2D3139]/50 animate-in fade-in zoom-in-95 duration-200">
              <Monitor size={48} className="mx-auto text-[#9CA3AF]/40 mb-4" />
              <p className="text-[#9CA3AF] mb-6">Você ainda não tem telas configuradas.</p>
              <button onClick={openCreateModal} className="text-[#7C3AED] font-bold hover:text-[#6D28D9] hover:underline">Criar primeira tela</button>
            </div>
          )}
        </div>
      )}
      {/* LISTA DE DISPOSITIVOS VINCULADOS */}
      {devices.filter(d => d.status === 'linked').length > 0 && (
        <div className="mt-16 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h2 className="text-xl font-bold text-slate-300 mb-6 flex items-center gap-2">
            <Tv className="text-[#7C3AED]" /> Dispositivos Vinculados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {devices.filter(d => d.status === 'linked').map(device => {
              const linkedDisplay = displays.find(d => d.id === device.display_id);
              const isOnline = (Date.now() - device.last_seen) < 60000; // 1 min timeout

              return (
                <div key={device.id} className="bg-[#2D3139]/40 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-[#9CA3AF]/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-[#64748B]'}`}></div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">{device.name || 'Dispositivo sem nome'}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {linkedDisplay ? `Exibindo: ${linkedDisplay.name}` : 'Sem conteúdo'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmDeleteDevice(device.id)}
                    className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    title="Excluir Dispositivo"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
