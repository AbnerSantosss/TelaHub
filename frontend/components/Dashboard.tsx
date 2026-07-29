import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import {
  getDisplays,
  deleteDisplay,
  saveDisplay,
  getCurrentUser,
  logout,
  getUsers,
  saveUser,
  deleteUser,
  resendInvite,
  adminSendPasswordReset,
  getDevices,
  linkDevice,
  unlinkDevice,
  updateDeviceDisplay,
  getSmtpSettings,
  saveSmtpSettings,
  testSmtpConnection,
  getSmtpStatus,
  getEmailProviders,
  type EmailProvider,
  updateMyEmail,
  changeMyPassword,
  updateMyName,
  forgotPassword,
  getOrganizations,
  getSubscription
} from '../services/storage';
import { Display, User, Device, Organization, SubscriptionState } from '../types';
import { isApiError, getApiErrorMessage, setActiveOrganizationId } from '../libs/api';
import { checkoutUrl } from '../libs/external-urls';
import { MediaLibrary } from './MediaLibrary';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Button } from './ui/button';

// Decomposed components
import { TopBar } from './dashboard/TopBar';
import { ModuleNav } from './dashboard/ModuleNav';
import { DeviceChips } from './dashboard/DeviceChips';
import { OrganizationSelector } from './dashboard/OrganizationSelector';
import { DisplayGrid } from './dashboard/DisplayGrid';
import { SubscriptionBanner } from './dashboard/SubscriptionBanner';

// Decomposed Modals
import { CreateDisplayModal } from './dashboard/modals/CreateDisplayModal';
import { LinkDeviceModal } from './dashboard/modals/LinkDeviceModal';
import { UserManagementModal } from './dashboard/modals/UserManagementModal';
import { EmailSettingsModal } from './dashboard/modals/EmailSettingsModal';
import { AccountSettingsModal } from './dashboard/modals/AccountSettingsModal';
import { DisplaySettingsModal } from './dashboard/modals/DisplaySettingsModal';
import { RenameDisplayModal } from './dashboard/modals/RenameDisplayModal';
import { ConfirmDeleteModal } from './dashboard/modals/ConfirmDeleteModal';

const SELECTED_ORG_STORAGE_KEY = 'selectedOrgId';

const Dashboard: React.FC = () => {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  // Preferência de visualização apenas — o escopo de tenant é garantido pelo
  // servidor. Só é aplicada depois de validada contra a lista da API.
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_ORG_STORAGE_KEY)
  );
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
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
  const [smtpProviders, setSmtpProviders] = useState<EmailProvider[]>([]);
  const [smtpProvider, setSmtpProvider] = useState('gmail');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('TelaHub');
  const [smtpSource, setSmtpSource] = useState<'banco' | 'ambiente' | null>(null);
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

  // Display Settings Modal
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [settingsDisplay, setSettingsDisplay] = useState<Display | null>(null);
  const [settingsDeviceDisplayMap, setSettingsDeviceDisplayMap] = useState<Record<string, string>>({});

  // --- Account Settings States ---
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');

  // Sincronizar email quando o modal abrir
  useEffect(() => {
    if (isAccountModalOpen && currentUser) {
      setAccountEmail(currentUser.email || '');
      setEditName(currentUser.name || currentUser.username);
      setIsEditingName(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setAccountError('');
      setAccountSuccess('');
    }
  }, [isAccountModalOpen, currentUser]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setAccountActionLoading(true);
    setAccountError('');
    setAccountSuccess('');
    try {
      const res = await updateMyEmail(accountEmail.trim());
      setAccountSuccess(res.message || 'E-mail atualizado com sucesso!');
      if (currentUser) {
        currentUser.email = accountEmail.trim();
      }
    } catch (err: any) {
      setAccountError(err.message || 'Erro ao atualizar e-mail.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!currentUser || !editName.trim()) return;
    setAccountActionLoading(true);
    setAccountError('');
    setAccountSuccess('');
    try {
      const res = await updateMyName(editName.trim());
      setAccountSuccess(res.message || 'Nome atualizado com sucesso!');
      currentUser.name = editName.trim();
      setIsEditingName(false);
    } catch (err: any) {
      setAccountError(err.message || 'Erro ao atualizar nome.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAccountError('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setAccountError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setAccountActionLoading(true);
    setAccountError('');
    setAccountSuccess('');
    try {
      const res = await changeMyPassword(currentPassword, newPassword);
      setAccountSuccess(res.message || 'Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setAccountError(err.message || 'Erro ao alterar senha.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!currentUser || !currentUser.email) {
      setAccountError('E-mail do usuário não encontrado.');
      return;
    }
    setAccountActionLoading(true);
    setAccountError('');
    setAccountSuccess('');
    try {
      await forgotPassword(currentUser.email);
      setAccountSuccess('E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setAccountError(err.message || 'Erro ao enviar e-mail de redefinição.');
    } finally {
      setAccountActionLoading(false);
    }
  };

  const navigate = useNavigate();

  const refreshData = async () => {
    setLoading(true);
    try {
      const [displaysData, devicesData, user, smtpStatus, organizationsData, subscriptionData] = await Promise.all([
        getDisplays(),
        getDevices(),
        getCurrentUser(),
        getSmtpStatus(),
        getOrganizations(),
        // Nunca rejeita: devolve null se o endpoint de billing não existir ainda.
        getSubscription(),
      ]);

      setDisplays(displaysData);
      setDevices(devicesData);
      setCurrentUser(user);
      setSmtpConfigured(smtpStatus.configured);
      setOrganizations(organizationsData);
      setSubscription(subscriptionData);

      // Valida a preferência salva contra as organizações que a API devolveu.
      // Um id que não está mais na lista (troca de conta na mesma máquina,
      // perda de acesso) é descartado em vez de aplicado.
      setSelectedOrgId((previous) => {
        // Com uma única organização acessível não há o que escolher: fixa o
        // escopo nela. O seletor fica oculto neste caso, então sem isto o
        // `master` ficava permanentemente sem tenant — e toda operação que
        // exige escopo (upload de mídia, por exemplo) era recusada.
        if (organizationsData.length === 1) {
          const onlyOrgId = organizationsData[0].id;
          setActiveOrganizationId(onlyOrgId);
          return onlyOrgId;
        }

        if (!previous) {
          setActiveOrganizationId(null);
          return null;
        }
        const stillAccessible = organizationsData.some((org) => org.id === previous);
        if (stillAccessible && organizationsData.length > 1) {
          setActiveOrganizationId(previous);
          return previous;
        }
        setActiveOrganizationId(null);
        return null;
      });

      const users = await getUsers();
      setUsersList(users);
    } catch (error) {
      console.error("Dashboard: Falha ao carregar dados", error);
      toast.error("Falha ao carregar dados do painel.");
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
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectOrg = (organizationId: string | null) => {
    // Aceita apenas ids presentes na lista devolvida pela API.
    const isKnown = !organizationId || organizations.some((org) => org.id === organizationId);
    const nextId = isKnown ? organizationId : null;

    setSelectedOrgId(nextId);
    // Persiste a preferência E passa o escopo ao cliente de API, que o envia
    // como `X-Organization-Id` nas próximas requisições.
    setActiveOrganizationId(nextId);
  };

  // O seletor só faz sentido com mais de uma organização acessível (role master
  // ou cliente multi-loja). Com uma só, o seletor é ruído e não há o que filtrar.
  const hasMultipleOrganizations = organizations.length > 1;

  // Filtro puramente VISUAL. A segurança/isolamento de tenant é responsabilidade
  // do servidor: `GET /api/displays` já devolve apenas os dados da organização
  // do usuário autenticado.
  const visibleDisplays = hasMultipleOrganizations && selectedOrgId
    ? displays.filter((d) => d.organizationId === selectedOrgId)
    : displays;

  /**
   * Quem chega aqui estourou a quota do plano e quer contratar. O destino é o
   * checkout, não a página de preços: o checkout registra a sessão desde o
   * primeiro passo, então uma contratação que ficar pelo meio vira abandono
   * mensurável e recuperável — na página de preços ela seria invisível.
   *
   * Sem `planCode`: quem está aqui ainda não escolheu o plano, e o checkout
   * abre justamente no passo de escolha.
   */
  const handleChoosePlan = () => {
    window.location.href = checkoutUrl();
  };

  /**
   * Traduz erros de ação (criar tela / vincular TV / convidar usuário) em toast.
   * 402 = assinatura inválida, 403 = quota do plano estourada. Nos dois casos
   * a mensagem da API tem prioridade sobre qualquer texto nosso.
   */
  const notifyActionError = (error: unknown, fallback: string) => {
    const message = getApiErrorMessage(error, fallback);

    if (isApiError(error) && error.status === 402) {
      toast.error(message, {
        duration: 10000,
        action: { label: 'Escolher plano', onClick: handleChoosePlan },
      });
      return;
    }

    if (isApiError(error) && error.status === 403) {
      toast.error(message, {
        duration: 8000,
        action: { label: 'Ver planos', onClick: handleChoosePlan },
      });
      return;
    }

    toast.error(message);
  };

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
      await linkDevice(linkCode, selectedDisplayId, linkName);
      toast.success('Dispositivo vinculado com sucesso!');
      setIsLinkModalOpen(false);
      setLinkCode('');
      setLinkName('');
      setSelectedDisplayId('');
      await refreshData();
    } catch (error) {
      console.error("Erro ao vincular dispositivo:", error);
      notifyActionError(error, 'Código inválido ou dispositivo não encontrado.');
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
      toast.success('Dispositivo excluído com sucesso!');
      await refreshData();
      setIsDeleteDeviceModalOpen(false);
      setDeviceToDelete(null);
    } catch (error) {
      console.error("Erro ao desvincular:", error);
      toast.error("Erro ao excluir dispositivo. Tente novamente.");
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
      toast.success('Tela criada com sucesso!');
      await refreshData();
    } catch (error) {
      console.error("Dashboard: Erro ao criar tela:", error);
      notifyActionError(error, 'Erro ao criar tela. Verifique a conexão.');
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
      toast.success('Tela excluída com sucesso!');
      await refreshData();
      setIsDeleteDisplayModalOpen(false);
      setDisplayToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir tela:", error);
      toast.error("Erro ao excluir tela. Tente novamente.");
    } finally {
      setIsDeletingDisplay(false);
    }
  };

  // --- Rename Display ---
  const openRenameModal = (display: Display) => {
    setDisplayToRename(display);
    setRenameValue(display.name);
    setIsRenameModalOpen(true);
  };

  const handleRenameDisplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayToRename || !renameValue.trim()) return;
    setLoading(true);
    try {
      const updated: Display = { ...displayToRename, name: renameValue.trim(), updatedAt: Date.now() };
      await saveDisplay(updated);
      toast.success('Tela renomeada com sucesso!');
      await refreshData();
      setIsRenameModalOpen(false);
      setDisplayToRename(null);
    } catch (error) {
      console.error('Erro ao renomear tela:', error);
      toast.error('Erro ao renomear tela.');
    } finally {
      setLoading(false);
    }
  };

  // --- Cover Image ---
  const openCoverModal = (display: Display) => {
    setDisplayForCover(display);
    setIsCoverModalOpen(true);
  };

  const handleCoverSelect = async (url: string) => {
    if (!displayForCover) return;
    setLoading(true);
    try {
      const updated: Display = { ...displayForCover, coverImage: url, updatedAt: Date.now() };
      await saveDisplay(updated);
      toast.success('Imagem de capa atualizada!');
      await refreshData();
      setIsCoverModalOpen(false);
      setDisplayForCover(null);
      if (settingsDisplay && settingsDisplay.id === displayForCover.id) {
        setSettingsDisplay({ ...updated });
      }
    } catch (error) {
      console.error('Erro ao definir capa:', error);
      toast.error('Erro ao definir capa.');
    } finally {
      setLoading(false);
    }
  };

  // --- Display Settings Modal ---
  const openDisplaySettings = (display: Display) => {
    setSettingsDisplay(display);
    const map: Record<string, string> = {};
    devices.filter(d => d.status === 'linked' && d.display_id === display.id).forEach(d => {
      map[d.id] = d.display_id || '';
    });
    setSettingsDeviceDisplayMap(map);
    setIsDisplaySettingsOpen(true);
  };

  const handleDeviceDisplayChange = async (deviceId: string, newDisplayId: string) => {
    try {
      await updateDeviceDisplay(deviceId, newDisplayId);
      toast.success('Dispositivo reatribuído com sucesso!');
      await refreshData();
      setSettingsDeviceDisplayMap(prev => ({ ...prev, [deviceId]: newDisplayId }));
    } catch (error) {
      console.error('Erro ao reatribuir dispositivo:', error);
      toast.error('Erro ao alterar a tela do dispositivo.');
    }
  };

  const handleRemoveCover = async (display?: Display) => {
    const target = display || displayForCover;
    if (!target) return;
    setLoading(true);
    try {
      const updated: Display = { ...target, coverImage: '', updatedAt: Date.now() };
      await saveDisplay(updated);
      toast.success('Capa removida com sucesso!');
      await refreshData();
      setIsCoverModalOpen(false);
      setDisplayForCover(null);
      if (settingsDisplay && settingsDisplay.id === target.id) {
        setSettingsDisplay({ ...updated });
      }
    } catch (error) {
      console.error('Erro ao remover capa:', error);
      toast.error('Erro ao remover capa.');
    } finally {
      setLoading(false);
    }
  };

  // --- User Handlers ---
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error('Informe um e-mail válido para enviar o convite.');
      return;
    }

    setUserActionLoading(true);
    try {
      await saveUser(inviteEmail.trim(), inviteRole);
      const updatedUsers = await getUsers();
      setUsersList(updatedUsers);
      const savedEmail = inviteEmail.trim();
      setInviteEmail('');
      setInviteRole('user');
      toast.success(`Convite enviado com sucesso para ${savedEmail}`);
    } catch (err) {
      notifyActionError(err, 'Erro desconhecido ao enviar convite. Tente novamente.');
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
      toast.success('Usuário removido com sucesso!');
      const updatedUsers = await getUsers();
      setUsersList(updatedUsers);
      setIsDeleteUserModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir o usuário.');
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
      // O catálogo vem junto: é ele que define host/porta ao trocar de provedor,
      // então a interface não pode montar o seletor antes de tê-lo.
      const [cfg, providers] = await Promise.all([getSmtpSettings(), getEmailProviders()]);
      setSmtpProviders(providers);
      setSmtpProvider(cfg.smtp_provider || 'gmail');
      setSmtpHost(cfg.smtp_host || '');
      setSmtpPort(cfg.smtp_port || 587);
      setSmtpSecure(!!cfg.smtp_secure);
      setSmtpUser(cfg.smtp_user || '');
      setSmtpFromEmail(cfg.smtp_from_email || '');
      setSmtpFromName(cfg.smtp_from_name || 'TelaHub');
      setSmtpSource(cfg.source);
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

  /** Aplica o preset ao trocar de provedor, preservando o que o operador digitou. */
  const handleSelectProvider = (id: string) => {
    setSmtpProvider(id);
    const preset = smtpProviders.find((p) => p.id === id);
    if (!preset) return;
    setSmtpHost(preset.host);
    setSmtpPort(preset.port);
    setSmtpSecure(preset.secure);
    // SendGrid e Resend autenticam com um usuário fixo; preenchê-lo evita o erro
    // de digitar o e-mail ali e receber recusa de autenticação sem explicação.
    if (preset.fixedUser) setSmtpUser(preset.fixedUser);
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpUser) {
      toast.error('Preencha o usuário de autenticação.');
      return;
    }
    if (!smtpPass && !smtpHasSavedPass) {
      toast.error('Preencha a senha ou chave de API.');
      return;
    }
    const preset = smtpProviders.find((p) => p.id === smtpProvider);
    if (!smtpHost && !preset?.host) {
      toast.error('Informe o servidor SMTP (host).');
      return;
    }
    if (preset?.fixedUser && !smtpFromEmail) {
      toast.error(`${preset.label} autentica com usuário fixo — informe o e-mail remetente.`);
      return;
    }
    setSmtpLoading(true);
    try {
      const passToSend = smtpPass || (smtpHasSavedPass ? '__KEEP_CURRENT__' : '');
      await saveSmtpSettings({
        smtp_provider: smtpProvider,
        smtp_host: smtpHost || preset?.host || '',
        smtp_port: smtpPort,
        smtp_secure: smtpSecure,
        smtp_user: smtpUser.trim(),
        smtp_pass: passToSend,
        smtp_from_email: (smtpFromEmail || (preset?.fixedUser ? '' : smtpUser)).trim(),
        smtp_from_name: smtpFromName.trim() || 'TelaHub',
      });
      setSmtpTestResult(null);
      toast.success('Configurações SMTP salvas com sucesso!');
      setSmtpConfigured(true);
      setSmtpHasSavedPass(true);
      setSmtpSource('banco');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
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
      toast.success('Link copiado para a área de transferência!');
    } catch (err) {
      prompt("Copie o link abaixo:", url);
    }
  };

  const openPlayer = (slug: string) => {
    window.open(getPlayerUrl(slug), '_blank');
  };

  const handleResendInvite = async (email: string) => {
    try {
      await resendInvite(email);
      toast.success('Código de convite reenviado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reenviar convite.');
    }
  };

  const handleSendResetPassword = async (email: string) => {
    try {
      await adminSendPasswordReset(email);
      toast.success('E-mail de redefinição de senha enviado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao redefinir senha.');
    }
  };

  return (
    <div className="min-h-screen relative z-10" style={{ color: 'var(--color-text)' }}>
      <div className="th-container py-6 md:py-8 relative min-h-screen">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 relative z-10"
        >
          <TopBar
            currentUser={currentUser}
            loading={loading}
            displays={displays}
            devices={devices}
            onLinkTv={() => setIsLinkModalOpen(true)}
            onCreateDisplay={openCreateModal}
            onRefresh={refreshData}
            onLogout={handleLogout}
          />

          {/* Estado da assinatura — não renderiza nada se o endpoint de billing
              estiver indisponível (backend paralelo ainda não no ar). */}
          <SubscriptionBanner subscription={subscription} onChoosePlan={handleChoosePlan} />

          <ModuleNav
            currentUser={currentUser}
            onOpenMediaLibrary={() => setIsMediaLibraryOpen(true)}
            onOpenUserManagement={() => setIsUserModalOpen(true)}
            onOpenEmailSettings={openSettingsModal}
          />

          {/* STATUS BAR — organização selecionada + dispositivos vinculados */}
          <div className="flex items-center gap-3 flex-wrap mb-6 px-1">
            {hasMultipleOrganizations && (
              <OrganizationSelector
                organizations={organizations}
                selectedOrgId={selectedOrgId}
                onChange={handleSelectOrg}
              />
            )}
            {devices.filter(d => d.status === 'linked').length > 0 ? (
              <DeviceChips devices={devices} displays={displays} />
            ) : !loading && (
              <button
                onClick={() => setIsLinkModalOpen(true)}
                className="text-[11px] font-medium text-slate-500 hover:text-[#0ea5e9] transition-colors"
              >
                Nenhuma TV pareada ainda — clique aqui para parear a primeira
              </button>
            )}
          </div>
        </motion.div>

        {/* DISPLAY GRID */}
        <DisplayGrid
          displays={visibleDisplays}
          devices={devices}
          loading={loading}
          copiedId={copiedId}
          onNavigateToEdit={(id) => navigate(`/edit/${id}`)}
          onCopyPlayerLink={copyPlayerLink}
          onOpenPlayer={openPlayer}
          onOpenRenameModal={openRenameModal}
          onOpenCoverModal={openCoverModal}
          onRemoveCover={handleRemoveCover}
          onDeleteDisplay={handleDelete}
          onOpenDisplaySettings={openDisplaySettings}
          onCreateFirstDisplay={openCreateModal}
        />

        {/* Dispositivos vinculados agora exibidos como chips no topo */}
      </div>

      {/* FIXED ACCOUNT SETTINGS BUTTON */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsAccountModalOpen(true)}
        className="fixed bottom-6 left-6 z-40 size-12 bg-surface/80 border border-border hover:border-accent/50 text-text-muted hover:text-accent rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group backdrop-blur-md"
        title="Minha Conta"
        id="gear-account-settings"
      >
        <Settings size={20} className="transition-transform duration-500 group-hover:rotate-90" />
      </Button>

      {/* MODALS */}
      <CreateDisplayModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        newDisplayName={newDisplayName}
        setNewDisplayName={setNewDisplayName}
        newDisplayOrientation={newDisplayOrientation}
        setNewDisplayOrientation={setNewDisplayOrientation}
        onSubmit={handleCreateConfirm}
      />

      <LinkDeviceModal
        open={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        displays={displays}
        linkCode={linkCode}
        setLinkCode={setLinkCode}
        linkName={linkName}
        setLinkName={setLinkName}
        selectedDisplayId={selectedDisplayId}
        setSelectedDisplayId={setSelectedDisplayId}
        onSubmit={handleLinkDevice}
        loading={loading}
      />

      <UserManagementModal
        open={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        usersList={usersList}
        currentUser={currentUser}
        smtpConfigured={smtpConfigured}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        onSubmitInvite={handleInviteUser}
        loading={userActionLoading}
        onDeleteUser={confirmDeleteUser}
        onResendInvite={handleResendInvite}
        onSendResetPassword={handleSendResetPassword}
      />

      <EmailSettingsModal
        open={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        providers={smtpProviders}
        provider={smtpProvider}
        onSelectProvider={handleSelectProvider}
        smtpHost={smtpHost}
        setSmtpHost={setSmtpHost}
        smtpPort={smtpPort}
        setSmtpPort={setSmtpPort}
        smtpSecure={smtpSecure}
        setSmtpSecure={setSmtpSecure}
        smtpUser={smtpUser}
        setSmtpUser={setSmtpUser}
        smtpPass={smtpPass}
        setSmtpPass={setSmtpPass}
        smtpFromEmail={smtpFromEmail}
        setSmtpFromEmail={setSmtpFromEmail}
        smtpFromName={smtpFromName}
        setSmtpFromName={setSmtpFromName}
        smtpSource={smtpSource}
        smtpHasSavedPass={smtpHasSavedPass}
        smtpTestResult={smtpTestResult}
        smtpLoading={smtpLoading}
        onTestSmtp={handleTestSmtp}
        onSaveSmtp={handleSaveSmtp}
      />

      <AccountSettingsModal
        open={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        accountEmail={accountEmail}
        setAccountEmail={setAccountEmail}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        editName={editName}
        setEditName={setEditName}
        isEditingName={isEditingName}
        setIsEditingName={setIsEditingName}
        accountError={accountError}
        accountSuccess={accountSuccess}
        accountActionLoading={accountActionLoading}
        smtpConfigured={smtpConfigured}
        onUpdateEmail={handleUpdateEmail}
        onUpdateName={handleUpdateName}
        onChangePassword={handleChangePassword}
        onSendResetEmail={handleSendResetEmail}
      />

      <DisplaySettingsModal
        open={isDisplaySettingsOpen}
        onClose={() => setIsDisplaySettingsOpen(false)}
        display={settingsDisplay}
        devices={devices}
        displays={displays}
        settingsDeviceDisplayMap={settingsDeviceDisplayMap}
        onDeviceDisplayChange={handleDeviceDisplayChange}
        onRemoveCover={handleRemoveCover}
        onOpenCoverModal={openCoverModal}
        onOpenRenameModal={openRenameModal}
      />

      <RenameDisplayModal
        open={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        displayToRename={displayToRename}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        onSubmit={handleRenameDisplay}
      />

      <ConfirmDeleteModal
        open={isDeleteDeviceModalOpen}
        onClose={() => setIsDeleteDeviceModalOpen(false)}
        title="Desvincular Dispositivo"
        description="Tem certeza de que deseja desvincular o dispositivo"
        itemName={devices.find(d => d.id === deviceToDelete)?.name || 'Dispositivo'}
        onConfirm={executeDeleteDevice}
        loading={loading}
      />

      <ConfirmDeleteModal
        open={isDeleteUserModalOpen}
        onClose={() => setIsDeleteUserModalOpen(false)}
        title="Remover Usuário"
        description="Tem certeza de que deseja remover o usuário"
        itemName={userToDelete?.username || 'Usuário'}
        onConfirm={executeDeleteUser}
        loading={userActionLoading}
      />

      <ConfirmDeleteModal
        open={isDeleteDisplayModalOpen}
        onClose={() => setIsDeleteDisplayModalOpen(false)}
        title="Excluir Tela"
        description="Tem certeza de que deseja excluir permanentemente a tela"
        itemName={displayToDelete?.name || 'Tela'}
        onConfirm={executeDeleteDisplay}
        loading={isDeletingDisplay}
      />

      {isCoverModalOpen && displayForCover && (
        <MediaLibrary
          onClose={() => { setIsCoverModalOpen(false); setDisplayForCover(null); }}
          onSelect={handleCoverSelect}
          allowedTypes="image"
        />
      )}

      {isMediaLibraryOpen && (
        <MediaLibrary onClose={() => setIsMediaLibraryOpen(false)} />
      )}
    </div>
  );
};

export default Dashboard;
