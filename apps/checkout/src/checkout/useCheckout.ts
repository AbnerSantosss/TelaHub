// Estado do checkout do comprador: catálogo, sessão, passos e sincronização.
//
// Duas regras estruturam este arquivo:
//
// 1. A SESSÃO NASCE NA PRIMEIRA VISITA e cada passo concluído é um PATCH. É isso
//    que alimenta o relatório de abandono por etapa — sem o PATCH por passo, o
//    painel saberia que houve abandono, mas não onde.
// 2. O VALOR É DO SERVIDOR. A estimativa local só preenche o intervalo entre o
//    clique e a resposta; quando o PATCH volta, o `amountCents` dele é o que fica.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { isApiError } from '../lib/api';
import { declinedCard, isLuhnValid, randomCard } from '../lib/fake-data';
import {
  annualSavingsPercent,
  billedScreens,
  estimateMonthlyCents,
  fetchPlanCatalog,
  hasAnnualOffer,
  maxScreensOf,
  unitCentsFor,
  yearTotalCents,
  type BillingInterval,
  type Plan,
  type PlanCatalog,
} from '../lib/plans';
import { newEventId } from '../lib/tracking';
import {
  purchaseDedupPayload,
  trackAddPaymentInfo,
  trackBeginCheckout,
  trackPurchase,
  type MoneySnapshot,
} from './analytics';
import {
  createSession,
  fetchPaymentConfig,
  getSession,
  readAttribution,
  readSelectionHint,
  replaceUrlWithToken,
  simulatePayment,
  startPayment,
  submitSession,
  updateSession,
  type CheckoutPaymentResult,
  type CheckoutSession,
  type PaymentConfig,
  type PaymentMethod,
  type StartPaymentResult,
  type UpdateSessionInput,
} from '../lib/session';
import { localPhoneDigits, maskCnpj, maskCpf, maskPhone, onlyDigits } from './format';
import {
  emptyIdentity,
  IDENTITY_FIELD_ORDER,
  validateIdentity,
  validateIdentityField,
  type DocumentKind,
  type IdentityDraft,
  type IdentityErrors,
  type IdentityField,
} from './validation';

export type StepId = 'identify' | 'plan' | 'payment';

export const STEP_ORDER: StepId[] = ['identify', 'plan', 'payment'];

/** Debounce da mudança de telas: sem isso, cada clique no `+` seria um PATCH. */
const SCREENS_DEBOUNCE_MS = 600;

export interface FocusRequest {
  field: IdentityField;
  nonce: number;
}

// ─── Cartão ──────────────────────────────────────────────────────────────────
//
// O rascunho do cartão mora AQUI, e não dentro do `PaymentStep`, pela mesma
// razão que a identidade mora aqui: quem dispara a cobrança é o `finish()`, que
// também é chamado pela barra fixa do rodapé em telas estreitas. Se os campos
// vivessem no passo, o CTA do rodapé não teria como enviá-los.
//
// Nada disto é persistido em lugar nenhum — nem em `localStorage`, nem na
// sessão do servidor (ver o comentário em `payment.service.ts::startPayment`).

export interface CardDraft {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export type CardField = keyof CardDraft;

export type CardErrors = Partial<Record<CardField, string>>;

export const CARD_FIELD_ORDER: CardField[] = ['number', 'holder', 'expiry', 'cvv'];

const emptyCard = (): CardDraft => ({ number: '', holder: '', expiry: '', cvv: '' });

/** Grupos de 4, até 19 dígitos (o máximo aceito pelo backend). */
export const maskCardNumber = (value: string): string =>
  onlyDigits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();

/** `MM/AA`. A barra é inserida sozinha para o campo aceitar só a digitação. */
export const maskExpiry = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

/**
 * Validação de cartão do lado do cliente.
 *
 * Espelha `cardSchema` do backend de propósito — a régua real continua sendo a
 * dele; esta aqui só evita uma ida à rede (e uma tentativa de cobrança) para
 * erro de digitação. O Luhn reusa `isLuhnValid` de `fake-data` em vez de
 * reimplementar: duas cópias do mesmo algoritmo divergem com o tempo, e a
 * divergência aqui significaria o gerador de teste produzindo cartão que o
 * próprio formulário recusa.
 */
export function validateCardField(field: CardField, draft: CardDraft): string | undefined {
  if (field === 'number') {
    const digits = onlyDigits(draft.number);
    if (!digits) return 'Informe o número do cartão.';
    if (digits.length < 13 || digits.length > 19) return 'O número deve ter de 13 a 19 dígitos.';
    if (!isLuhnValid(digits)) return 'Número de cartão inválido. Confira os dígitos.';
    return undefined;
  }

  if (field === 'holder') {
    const holder = draft.holder.trim();
    if (holder.length < 2) return 'Informe o nome impresso no cartão.';
    if (holder.length > 120) return 'Nome muito longo.';
    return undefined;
  }

  if (field === 'expiry') {
    const match = /^(0[1-9]|1[0-2])\/([0-9]{2})$/.exec(draft.expiry.trim());
    if (!match) return 'Validade inválida (use MM/AA).';
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const now = new Date();
    // Cartão vale até o ÚLTIMO dia do mês impresso: comparar com o primeiro dia
    // do mês seguinte evita recusar um cartão que ainda é válido hoje.
    const expiresAfter = new Date(year, month, 1);
    if (expiresAfter <= new Date(now.getFullYear(), now.getMonth(), 1)) {
      return 'Este cartão está vencido.';
    }
    return undefined;
  }

  const cvv = onlyDigits(draft.cvv);
  if (cvv.length < 3 || cvv.length > 4) return 'CVV inválido (3 ou 4 dígitos).';
  return undefined;
}

function validateCard(draft: CardDraft): CardErrors {
  const errors: CardErrors = {};
  for (const field of CARD_FIELD_ORDER) {
    const error = validateCardField(field, draft);
    if (error) errors[field] = error;
  }
  return errors;
}

const messageOf = (error: unknown, fallback: string): string => {
  if (isApiError(error)) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function useCheckout(routeToken?: string) {
  // ─── Catálogo ──────────────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogAttempt, setCatalogAttempt] = useState(0);

  // ─── Sessão ────────────────────────────────────────────────────────────────
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [forceCreate, setForceCreate] = useState(false);
  const [expired, setExpired] = useState(false);
  const tokenRef = useRef<string | null>(null);

  // ─── Seleção ───────────────────────────────────────────────────────────────
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [screens, setScreens] = useState(1);
  // O INTERVALO tem duas faces, e confundi-las é o bug fácil aqui:
  //
  // `intervalWish` é o que a PESSOA pediu (clicou em anual, ou chegou pela
  // landing com `?interval=yearly`). Ele sobrevive à troca de plano, para quem
  // veio da oferta anual não perder o anual ao comparar planos. Mas ele é só um
  // desejo: num plano sem oferta anual ele não vira cobrança nenhuma.
  const [intervalWish, setIntervalWish] = useState<BillingInterval>('monthly');
  // `annualDropped` guarda o momento em que o desejo não coube no plano — é o
  // que autoriza a tela a EXPLICAR a volta ao mensal em vez de simplesmente
  // desmarcar o anual nas costas de quem escolheu.
  const [annualDropped, setAnnualDropped] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [amountSyncing, setAmountSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);

  // ─── Identificação ─────────────────────────────────────────────────────────
  const [identity, setIdentity] = useState<IdentityDraft>(emptyIdentity);
  const [identityErrors, setIdentityErrors] = useState<IdentityErrors>({});
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  // ─── Passos ────────────────────────────────────────────────────────────────
  const [activeStep, setActiveStep] = useState<StepId>('identify');
  const [completed, setCompleted] = useState<Record<StepId, boolean>>({
    identify: false,
    plan: false,
    payment: false,
  });
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckoutPaymentResult | null>(null);

  // ─── Pagamento ─────────────────────────────────────────────────────────────
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentConfigError, setPaymentConfigError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [card, setCard] = useState<CardDraft>(emptyCard);
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const [paying, setPaying] = useState(false);
  const [confirmingPix, setConfirmingPix] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [payment, setPayment] = useState<StartPaymentResult | null>(null);

  const plans = useMemo(() => catalog?.plans ?? [], [catalog]);
  const selectedPlan = useMemo<Plan | null>(
    () => plans.find((plan) => plan.code === planCode) ?? null,
    [plans, planCode]
  );

  /** O plano escolhido tem preço anual publicado? Governa seletor e PATCH. */
  const annualAvailable = hasAnnualOffer(selectedPlan);
  /** O desejo da pessoa filtrado pelo plano: o intervalo que dá para contratar. */
  const requestedInterval: BillingInterval = annualAvailable ? intervalWish : 'monthly';

  // ─── Valores ───────────────────────────────────────────────────────────────
  //
  // Este bloco fica ANTES das ações de propósito: as ações de pagamento montam
  // o evento de conversão a partir daqui, e uma `const` declarada depois não
  // pode entrar na lista de dependências de um `useCallback` acima dela (TDZ na
  // hora do render, não na hora do clique — o erro aparece como tela branca).
  const localCents = estimateMonthlyCents(selectedPlan, screens, requestedInterval);
  const serverCents = session?.amountCents ?? 0;
  /**
   * Durante a ida ao servidor mostra a previsão; depois, o valor dele.
   * Vale tanto no mensal quanto no anual: `amountCents` é sempre o MENSAL
   * EQUIVALENTE, e o total do ano sai de multiplicar esse valor por 12.
   */
  const totalCents = amountSyncing ? localCents : serverCents;

  /**
   * Intervalo EXIBIDO. Segue a mesma regra do valor: previsão enquanto o PATCH
   * está no ar, servidor assim que a resposta chega. Manter "anual" marcado
   * sobre um `amountCents` que o servidor calculou como mensal seria exibir
   * exatamente a divergência de preço que este seletor existe para eliminar —
   * e desmarcar sozinho é o erro barato (a pessoa vê e clica de novo), enquanto
   * cobrar diferente do que a tela mostra é o erro caro.
   */
  const billingInterval: BillingInterval = !annualAvailable
    ? 'monthly'
    : amountSyncing
      ? requestedInterval
      : (session?.billingInterval ?? requestedInterval);

  /** Preço por tela/mês do intervalo em exibição (catálogo, não total). */
  const unitCents = unitCentsFor(selectedPlan, billingInterval);
  /** O que sai da conta no anual: 12 meses de uma vez. */
  const yearCents = yearTotalCents(totalCents);
  const annualSavings = annualSavingsPercent(selectedPlan);

  // ─── Medição (eventos de dinheiro) ─────────────────────────────────────────
  //
  // O retrato que todo evento de conversão usa. Note que o valor que entra aqui
  // é o MENSAL EQUIVALENTE: quem transforma em caixa do ciclo é
  // `cycleCashInReais`, dentro de `analytics.ts`, num lugar só.
  const moneySnapshot: MoneySnapshot = useMemo(
    () => ({
      plan: selectedPlan,
      billedScreens: selectedPlan ? billedScreens(selectedPlan, screens) : screens,
      monthlyEquivalentCents: totalCents,
      unitCentsPerScreen: unitCents,
      interval: billingInterval,
    }),
    [selectedPlan, screens, totalCents, unitCents, billingInterval]
  );

  /**
   * `begin_checkout` / `InitiateCheckout` — uma vez por visita.
   *
   * Espera `amountSyncing` baixar de propósito: disparado antes disso, o evento
   * levaria a PREVISÃO local em vez do valor do servidor, e o primeiro número
   * que o Meta aprende sobre esta pessoa seria o errado. Também exige plano
   * escolhido — "abriu o checkout sem plano" não tem valor para mandar, e um
   * `value: 0` no meio da série estraga a média que o algoritmo usa.
   */
  const beginTrackedRef = useRef(false);

  useEffect(() => {
    if (beginTrackedRef.current) return;
    if (!session || !planCode || amountSyncing) return;
    beginTrackedRef.current = true;
    trackBeginCheckout(moneySnapshot);
  }, [session, planCode, amountSyncing, moneySnapshot]);

  /** Métodos que já geraram `add_payment_info` — o evento não se repete por clique. */
  const paymentInfoTrackedRef = useRef<Set<string>>(new Set());

  /**
   * `eventID` do `Purchase`, gerado no NAVEGADOR e enviado à API junto com a
   * confirmação (campo `metaEventId`), para o webhook repetir o mesmo evento
   * pelo servidor com o mesmo id.
   *
   * Nasce na primeira tentativa de cobrança e sobrevive às retentativas: cartão
   * recusado seguido de cartão aprovado é UMA compra, e trocar o id no meio faria
   * o servidor confirmar com um id que o navegador não usou — que é exatamente a
   * duplicata que ele existe para evitar.
   */
  const purchaseEventIdRef = useRef<string | null>(null);
  const purchaseTrackedRef = useRef(false);

  const dedupForConfirmation = useCallback(() => {
    if (!purchaseEventIdRef.current) purchaseEventIdRef.current = newEventId();
    return purchaseDedupPayload(purchaseEventIdRef.current);
  }, []);

  // ─── Carga do catálogo ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setCatalogError(null);

    fetchPlanCatalog()
      .then((loaded) => {
        if (!cancelled) setCatalog(loaded);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCatalogError(
          messageOf(error, 'Não foi possível carregar os planos. Verifique sua conexão.')
        );
      });

    return () => {
      cancelled = true;
    };
  }, [catalogAttempt]);

  // ─── Configuração de pagamento ─────────────────────────────────────────────
  //
  // Falhar aqui NÃO derruba o checkout: sem provedor disponível (503) a etapa 3
  // volta ao caminho antigo — solicitação registrada e contato do comercial.
  // Bloquear a tela seria transformar uma indisponibilidade de gateway em lead
  // perdido.
  useEffect(() => {
    let cancelled = false;

    fetchPaymentConfig()
      .then((config) => {
        if (cancelled) return;
        setPaymentConfig(config);
        setPaymentConfigError(null);
        // Método único (ex.: provedor que só faz Pix) já vem escolhido: um
        // rádio solitário obrigatório é clique sem decisão.
        if (config.methods.length === 1) setPaymentMethod(config.methods[0] ?? null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPaymentConfig(null);
        setPaymentConfigError(
          messageOf(error, 'O pagamento online está indisponível no momento.')
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Abertura/criação da sessão ────────────────────────────────────────────
  const bootKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const effectiveToken = forceCreate ? null : (routeToken ?? null);
    const bootKey = `${effectiveToken ?? '(nova)'}#${sessionAttempt}`;
    // StrictMode roda o efeito duas vezes em desenvolvimento; sem esta guarda,
    // uma visita criaria DUAS sessões e duplicaria o lead no relatório.
    if (bootKeyRef.current === bootKey) return;
    bootKeyRef.current = bootKey;

    setSessionError(null);

    // A atribuição precisa ser lida antes de a URL ser reescrita com o token.
    const attribution = readAttribution();

    // Resultado obsoleto é descartado comparando a chave de boot, e NÃO por um
    // flag de cancelamento no cleanup. Motivo concreto: no StrictMode o efeito
    // roda, é limpo e roda de novo; um flag `cancelled` mataria a requisição da
    // primeira execução, enquanto a segunda seria bloqueada pela guarda de
    // deduplicação acima — e o checkout ficava preso em "carregando" para
    // sempre. Comparar a chave preserva as duas garantias: uma sessão por
    // visita, e nenhuma resposta antiga sobrescrevendo uma nova.
    const boot = async (myKey: string) => {
      const isStale = () => bootKeyRef.current !== myKey;

      try {
        const loaded = effectiveToken
          ? await getSession(effectiveToken)
          : await createSession(attribution);

        if (isStale()) return;
        tokenRef.current = loaded.publicToken;
        if (!effectiveToken) replaceUrlWithToken(loaded.publicToken);
        if (loaded.status === 'expired') setExpired(true);
        setSession(loaded);
      } catch (error) {
        if (isStale()) return;
        if (isApiError(error) && error.status === 410) {
          setExpired(true);
          return;
        }
        if (isApiError(error) && error.status === 404) {
          setSessionError('Este link de checkout não existe mais.');
          return;
        }
        setSessionError(
          messageOf(error, 'Não foi possível abrir o checkout. Verifique sua conexão.')
        );
      }
    };

    void boot(bootKey);
  }, [routeToken, sessionAttempt, forceCreate]);

  // ─── Hidratação (link de recuperação reabre onde a pessoa parou) ────────────
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!session || hydratedRef.current) return;
    hydratedRef.current = true;

    // Mescla em vez de sobrescrever: se a pessoa já digitou algo nesta visita,
    // o que veio do servidor não apaga o que está na tela.
    setIdentity((current) => {
      const digits = onlyDigits(session.document ?? '');
      const kind: DocumentKind = digits.length === 14 ? 'cnpj' : current.documentKind;
      return {
        name: session.name ?? current.name,
        email: session.email ?? current.email,
        phone: session.phone ? maskPhone(localPhoneDigits(session.phone)) : current.phone,
        documentKind: kind,
        document: digits
          ? kind === 'cnpj'
            ? maskCnpj(digits)
            : maskCpf(digits)
          : current.document,
        companyName: session.companyName ?? current.companyName,
        // Volta do servidor para a sessão retomada por link: quem já marcou a
        // caixa e voltou depois vê a própria escolha, e não uma caixa limpa
        // que o PATCH seguinte interpretaria como revogação.
        marketingOptIn: session.marketingOptIn ?? current.marketingOptIn,
      };
    });

    const identified = !!(session.name && session.email);
    const hasPlan = !!session.planCode;
    setCompleted({
      identify: identified,
      plan: identified && hasPlan,
      payment: !!session.paymentAt,
    });
    setActiveStep(identified ? (hasPlan ? 'payment' : 'plan') : 'identify');
  }, [session]);

  // ─── Sincronização com o servidor ──────────────────────────────────────────
  const pendingRef = useRef<UpdateSessionInput>({});
  const timerRef = useRef<number | null>(null);

  /** `true` quando o erro já foi tratado como estado de tela (não é falha de rede). */
  const handleFatal = useCallback((error: unknown): boolean => {
    if (!isApiError(error)) return false;
    if (error.status === 410 || error.code === 'session_expired') {
      setExpired(true);
      return true;
    }
    if (error.status === 409 || error.code === 'session_already_paid') {
      setSession((current) => (current ? { ...current, status: 'paid' } : current));
      return true;
    }
    return false;
  }, []);

  const sendPatch = useCallback(
    async (extra: UpdateSessionInput = {}): Promise<boolean> => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const payload: UpdateSessionInput = { ...pendingRef.current, ...extra };
      pendingRef.current = {};

      const token = tokenRef.current;
      if (!token || Object.keys(payload).length === 0) {
        setAmountSyncing(false);
        return true;
      }

      setAmountSyncing(true);
      try {
        const next = await updateSession(token, payload);
        setSession(next);
        setSyncFailed(false);
        return true;
      } catch (error) {
        if (handleFatal(error)) return false;
        setSyncFailed(true);
        toast.error(messageOf(error, 'Não conseguimos salvar agora. Verifique sua conexão.'));
        return false;
      } finally {
        setAmountSyncing(false);
      }
    },
    [handleFatal]
  );

  const queuePatch = useCallback(
    (payload: UpdateSessionInput, delay: number) => {
      pendingRef.current = { ...pendingRef.current, ...payload };
      setAmountSyncing(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void sendPatch();
      }, delay);
    },
    [sendPatch]
  );

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  // ─── Pré-seleção vinda do link (?plan=rede&screens=8&interval=yearly) ──────
  const selectionHydratedRef = useRef(false);

  useEffect(() => {
    if (!catalog || !session || selectionHydratedRef.current) return;
    selectionHydratedRef.current = true;

    const known = (code: string | null): string | null =>
      code && catalog.plans.some((plan) => plan.code === code) ? code : null;

    const hint = readSelectionHint();
    const fromSession = known(session.planCode);
    const fromLink = fromSession ? null : known(hint.planCode);
    const code = fromSession ?? fromLink;

    const plan = catalog.plans.find((candidate) => candidate.code === code) ?? null;
    const wanted = session.screens > 1 ? session.screens : (hint.screens ?? session.screens);
    const clamped = Math.min(Math.max(1, wanted), maxScreensOf(plan));

    // Mesma precedência do plano: o que o servidor já sabe manda, e o link só
    // decide quando a sessão ainda está no padrão. Uma sessão retomada não pode
    // voltar para o mensal só porque o link de recuperação não tinha o parâmetro.
    const wish: BillingInterval =
      session.billingInterval === 'yearly' ? 'yearly' : hint.interval;
    const interval: BillingInterval = hasAnnualOffer(plan) ? wish : 'monthly';

    if (code) setPlanCode(code);
    setScreens(clamped);
    setIntervalWish(wish);
    // Link pedindo anual num plano que não tem anual (`?plan=enterprise&
    // interval=yearly`): a tela precisa dizer por que o anual não apareceu, em
    // vez de simplesmente ignorar metade do link que a pessoa clicou.
    setAnnualDropped(!!plan && wish === 'yearly' && interval === 'monthly');

    // Só registra no servidor o que ele ainda não sabe — o plano/telas/intervalo
    // vindos do próprio servidor não geram PATCH redundante.
    const patch: UpdateSessionInput = {};
    if (fromLink) patch.planCode = fromLink;
    if (clamped !== session.screens) patch.screens = clamped;
    if (interval !== session.billingInterval) patch.interval = interval;
    if (Object.keys(patch).length > 0) queuePatch(patch, 0);
  }, [catalog, session, queuePatch]);

  // ─── Ações de seleção ──────────────────────────────────────────────────────
  const choosePlan = useCallback(
    (code: string) => {
      setPlanError(null);
      setPlanCode(code);
      const plan = plans.find((candidate) => candidate.code === code) ?? null;
      const clamped = Math.min(screens, maxScreensOf(plan));
      if (clamped !== screens) setScreens(clamped);

      // Trocar de plano pode invalidar o anual (grátis e Enterprise não têm
      // oferta anual). O intervalo vai junto no MESMO PATCH em vez de num
      // segundo: entre um patch e outro existiria um instante em que o servidor
      // teria plano novo com intervalo velho — e é desse instante que sai um
      // `amountCents` com preço que não existe em lugar nenhum.
      const interval: BillingInterval =
        hasAnnualOffer(plan) && intervalWish === 'yearly' ? 'yearly' : 'monthly';
      setAnnualDropped(intervalWish === 'yearly' && interval === 'monthly');

      // Escolher plano é um clique deliberado: vai sem debounce.
      queuePatch({ planCode: code, screens: clamped, interval }, 0);
    },
    [plans, screens, intervalWish, queuePatch]
  );

  /**
   * Troca mensal ↔ anual. Só PATCHa quando o plano de fato tem oferta anual —
   * mandar `interval: 'yearly'` para um plano sem preço anual seria pedir ao
   * servidor um valor que ele não sabe calcular.
   */
  const chooseInterval = useCallback(
    (next: BillingInterval) => {
      setIntervalWish(next);
      setAnnualDropped(false);
      const plan = plans.find((candidate) => candidate.code === planCode) ?? null;
      if (!hasAnnualOffer(plan)) return;
      queuePatch({ interval: next }, 0);
    },
    [plans, planCode, queuePatch]
  );

  const changeScreens = useCallback(
    (value: number) => {
      const max = maxScreensOf(selectedPlan);
      const next = Math.min(Math.max(1, Math.floor(value) || 1), max);
      setScreens(next);
      queuePatch({ screens: next }, SCREENS_DEBOUNCE_MS);
    },
    [selectedPlan, queuePatch]
  );

  const retrySync = useCallback(() => {
    const payload: UpdateSessionInput = { screens, interval: requestedInterval };
    if (planCode) payload.planCode = planCode;
    void sendPatch(payload);
  }, [planCode, screens, requestedInterval, sendPatch]);

  // ─── Ações de identificação ────────────────────────────────────────────────
  /**
   * Setter próprio para o consentimento de novidades.
   *
   * Não entra em `setIdentityField` porque `IdentityField` é o conjunto dos
   * campos VALIDÁVEIS — e este não é um deles. Reaproveitar aquele setter
   * exigiria alargar o tipo, e alargá-lo abriria a porta para o consentimento
   * um dia participar da validação que trava o botão "Continuar". Marketing
   * não pode bloquear compra.
   */
  const setMarketingOptIn = useCallback((value: boolean) => {
    setIdentity((current) => ({ ...current, marketingOptIn: value }));
  }, []);

  const setIdentityField = useCallback((field: IdentityField, value: string) => {
    setIdentity((current) => {
      if (field === 'phone') return { ...current, phone: maskPhone(value) };
      if (field === 'document') {
        return {
          ...current,
          document: current.documentKind === 'cnpj' ? maskCnpj(value) : maskCpf(value),
        };
      }
      return { ...current, [field]: value };
    });
    // Erro sai da tela ao corrigir; a revalidação acontece no blur/avançar.
    setIdentityErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }, []);

  const setDocumentKind = useCallback((kind: DocumentKind) => {
    setIdentity((current) =>
      current.documentKind === kind
        ? current
        : { ...current, documentKind: kind, document: '', companyName: '' }
    );
    setIdentityErrors((current) => ({ ...current, document: undefined, companyName: undefined }));
  }, []);

  const blurIdentityField = useCallback(
    (field: IdentityField) => {
      setIdentityErrors((current) => ({
        ...current,
        [field]: validateIdentityField(field, identity),
      }));
    },
    [identity]
  );

  const submitIdentify = useCallback(async () => {
    const errors = validateIdentity(identity);
    setIdentityErrors(errors);

    const firstInvalid = IDENTITY_FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setFocusRequest({ field: firstInvalid, nonce: Date.now() });
      return;
    }

    const digits = onlyDigits(identity.document);
    const payload: UpdateSessionInput = {
      name: identity.name.trim(),
      email: identity.email.trim(),
      // `55` explícito: o campo mostra `+55` fixo, então o registro guarda o
      // número completo e não fica ambíguo no painel.
      phone: `55${onlyDigits(identity.phone)}`,
      document: digits,
      // Vai SEMPRE, inclusive `false`: a ausência do campo significaria "não
      // mexeu", e quem desmarca a caixa depois de tê-la marcado estaria
      // revogando um consentimento que o servidor nunca ficaria sabendo ter
      // sido revogado.
      marketingOptIn: identity.marketingOptIn,
    };
    if (identity.documentKind === 'cnpj') payload.companyName = identity.companyName.trim();

    setSavingIdentity(true);
    const ok = await sendPatch(payload);
    setSavingIdentity(false);
    if (!ok) return;

    setCompleted((current) => ({ ...current, identify: true }));
    setActiveStep('plan');
  }, [identity, sendPatch]);

  const confirmPlan = useCallback(async () => {
    if (!planCode) {
      setPlanError('Escolha um plano para continuar.');
      return;
    }

    setSavingPlan(true);
    const ok = await sendPatch({ planCode, screens, interval: requestedInterval });
    setSavingPlan(false);
    if (!ok) return;

    setCompleted((current) => ({ ...current, plan: true }));
    setActiveStep('payment');
  }, [planCode, screens, requestedInterval, sendPatch]);

  // ─── Ações de pagamento ────────────────────────────────────────────────────

  /**
   * Só é possível cobrar quando há provedor ativo COM método oferecido e um
   * valor cobrável. Plano sob consulta e plano gratuito ficam de fora — o
   * backend recusaria (`amount_not_payable`), e mostrar um botão "Pagar
   * R$ 0,00" seria pior do que não mostrar método nenhum.
   */
  const canPayOnline =
    !!paymentConfig &&
    paymentConfig.methods.length > 0 &&
    !selectedPlan?.quoteOnly &&
    !selectedPlan?.free &&
    (session?.amountCents ?? 0) > 0;

  const selectPaymentMethod = useCallback(
    (method: PaymentMethod) => {
      setPaymentMethod(method);
      setPaymentError(null);
      // Recusa anterior some ao trocar de método: o motivo era do método antigo.
      setPayment((current) => (current && current.status === 'declined' ? null : current));

      // `add_payment_info`: escolher a forma de pagamento é o passo em que a
      // pessoa passa a preencher dados de cobrança. Uma vez por método — quem
      // fica alternando entre Pix e cartão gera um evento por método, não um
      // por clique, senão o denominador do relatório vira ruído.
      if (paymentInfoTrackedRef.current.has(method)) return;
      paymentInfoTrackedRef.current.add(method);
      trackAddPaymentInfo(moneySnapshot, method);
    },
    [moneySnapshot]
  );

  const setCardField = useCallback((field: CardField, value: string) => {
    setCard((current) => {
      if (field === 'number') return { ...current, number: maskCardNumber(value) };
      if (field === 'expiry') return { ...current, expiry: maskExpiry(value) };
      if (field === 'cvv') return { ...current, cvv: onlyDigits(value).slice(0, 4) };
      return { ...current, holder: value };
    });
    setCardErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }, []);

  const blurCardField = useCallback(
    (field: CardField) => {
      setCardErrors((current) => ({ ...current, [field]: validateCardField(field, card) }));
    },
    [card]
  );

  /**
   * Preenche o formulário com um cartão de teste. A tela só oferece isto quando
   * `paymentConfig.simulated` — com gateway real, um botão desses seria um
   * convite a tentar cobrança com número inventado.
   */
  const fillTestCard = useCallback((kind: 'approved' | 'declined' = 'approved') => {
    const fake = kind === 'declined' ? declinedCard() : randomCard();
    setCard({
      number: maskCardNumber(fake.number),
      holder: fake.holder,
      expiry: fake.expiry,
      cvv: fake.cvv,
    });
    setCardErrors({});
    setPaymentError(null);
    setPayment(null);
  }, []);

  /** Limpa o resultado para uma nova tentativa (o caminho da recusa). */
  const resetPayment = useCallback(() => {
    setPayment(null);
    setPaymentError(null);
  }, []);

  const payWith = useCallback(
    async (method: PaymentMethod, cardOverride?: CardDraft) => {
      const token = tokenRef.current;
      if (!token) return;

      const draft = cardOverride ?? card;
      if (method === 'credit_card') {
        const errors = validateCard(draft);
        setCardErrors(errors);
        if (CARD_FIELD_ORDER.some((field) => errors[field])) return;
      }

      // Mesma razão do fluxo antigo: a última mudança de telas em debounce
      // precisa estar gravada ANTES de cobrar — o valor cobrado é o do
      // servidor, e ele não pode ficar 600ms atrasado em relação à tela.
      const flushed = await sendPatch();
      if (!flushed) return;

      setPaymentError(null);
      setPaying(true);

      // Rede de segurança do `add_payment_info`: quando o provedor oferece um
      // método só, ele já vem marcado sem passar por `selectPaymentMethod` (um
      // rádio solitário obrigatório é clique sem decisão) — e o evento nunca
      // sairia. Aqui a pessoa já preencheu e mandou cobrar, então o passo
      // aconteceu de fato.
      if (!paymentInfoTrackedRef.current.has(method)) {
        paymentInfoTrackedRef.current.add(method);
        trackAddPaymentInfo(moneySnapshot, method);
      }

      try {
        const outcome = await startPayment(token, {
          method,
          card:
            method === 'credit_card'
              ? {
                  number: onlyDigits(draft.number),
                  holder: draft.holder.trim(),
                  expiry: draft.expiry.trim(),
                  cvv: onlyDigits(draft.cvv),
                }
              : undefined,
          // O `eventID` do `Purchase` viaja JUNTO com a cobrança, antes de
          // existir resposta: é o servidor que vai precisar dele para não
          // duplicar a conversão quando confirmar o pagamento.
          tracking: dedupForConfirmation(),
        });

        setPayment(outcome);
        if (outcome.paid) {
          setCompleted((current) => ({ ...current, payment: true }));
          // O rascunho do cartão é descartado assim que deixa de ser
          // necessário: nada de número de cartão parado na memória da aba.
          setCard(emptyCard());
          setCardErrors({});
        }
      } catch (error) {
        if (!handleFatal(error)) {
          setPaymentError(messageOf(error, 'Não conseguimos processar o pagamento agora.'));
        }
      } finally {
        setPaying(false);
      }
    },
    [card, dedupForConfirmation, handleFatal, moneySnapshot, sendPatch]
  );

  /** "Eu paguei o Pix" da demonstração. Só existe enquanto o provedor é simulado. */
  const confirmSimulated = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;

    setPaymentError(null);
    setConfirmingPix(true);
    try {
      const outcome = await simulatePayment(token, dedupForConfirmation());
      if (!outcome.paid) {
        setPaymentError(outcome.message);
        return;
      }
      // Mantém o `method`/`provider` do resultado anterior e só promove o
      // estado — assim a tela de sucesso continua sabendo que veio do Pix.
      setPayment((current) =>
        current
          ? { ...current, status: 'approved', paid: true, pix: null, message: outcome.message }
          : current
      );
      setCompleted((current) => ({ ...current, payment: true }));
    } catch (error) {
      if (!handleFatal(error)) {
        setPaymentError(messageOf(error, 'Não conseguimos confirmar o pagamento simulado.'));
      }
    } finally {
      setConfirmingPix(false);
    }
  }, [dedupForConfirmation, handleFatal]);

  /**
   * `purchase` / `Purchase` — chamado pela tela de obrigado, quando ela aparece.
   *
   * Fica aqui (e não dentro do componente) por causa do StrictMode: em
   * desenvolvimento o efeito da tela roda duas vezes, e uma trava guardada no
   * próprio componente não sobrevive à segunda montagem — sairiam dois
   * `Purchase` com o mesmo id. O `ref` do controlador sobrevive.
   *
   * `transaction_id` é o `publicToken` da sessão: é o único identificador que o
   * navegador e o servidor conhecem igual (o id da cobrança no provedor não
   * chega ao front). Se um dia a resposta trouxer o id do gateway, os DOIS
   * lados têm de passar a usá-lo no mesmo commit — meia troca vira pedido
   * duplicado no relatório de e-commerce.
   */
  const trackPurchaseNow = useCallback(() => {
    if (purchaseTrackedRef.current) return;
    if (!payment?.paid) return;
    const token = tokenRef.current ?? session?.publicToken ?? null;
    if (!token) return;
    purchaseTrackedRef.current = true;
    // O id só é gerado aqui se a confirmação tiver vindo por um caminho que não
    // passou por `dedupForConfirmation` — nesse caso não há par no servidor, e
    // um id novo é melhor do que nenhum (o evento do navegador ainda conta).
    trackPurchase(moneySnapshot, token, purchaseEventIdRef.current ?? newEventId());
  }, [moneySnapshot, payment, session]);

  const finish = useCallback(async () => {
    // Caminho NOVO: existe provedor e o valor é cobrável — a etapa 3 cobra.
    // `finish` continua sendo o ponto único de conclusão porque a barra fixa do
    // rodapé (telas estreitas) chama esta função, e não o botão do passo.
    if (canPayOnline) {
      if (payment?.paid || paying || confirmingPix) return;
      if (payment?.status === 'pending') {
        // Pix já gerado: o próximo passo é confirmar, não gerar outro QR
        // (dois QRs para a mesma sessão é o jeito mais fácil de alguém pagar
        // duas vezes). Com provedor real, quem confirma é o banco.
        if (payment.simulated) await confirmSimulated();
        else setPaymentError('Estamos aguardando a confirmação do seu Pix pelo banco.');
        return;
      }
      if (!paymentMethod) {
        setPaymentError('Escolha uma forma de pagamento para continuar.');
        return;
      }
      await payWith(paymentMethod);
      return;
    }

    // Caminho ANTIGO (plano sob consulta, gratuito ou gateway indisponível):
    // registra a solicitação e encaminha ao comercial, sem cobrar nada.
    const token = tokenRef.current;
    if (!token) return;

    // Garante que a última mudança de telas em debounce já esteja gravada antes
    // de finalizar — o valor da contratação não pode ficar de fora por 600ms.
    const flushed = await sendPatch();
    if (!flushed) return;

    setSubmitting(true);
    try {
      const outcome = await submitSession(token);
      setSession(outcome.session);
      setResult(outcome.payment);
      setCompleted((current) => ({ ...current, payment: true }));
    } catch (error) {
      if (!handleFatal(error)) {
        toast.error(messageOf(error, 'Não conseguimos concluir agora. Tente novamente.'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    canPayOnline,
    confirmSimulated,
    confirmingPix,
    handleFatal,
    payWith,
    payment,
    paymentMethod,
    paying,
    sendPatch,
  ]);

  // ─── Navegação entre passos ────────────────────────────────────────────────
  const editStep = useCallback((step: StepId) => {
    setActiveStep(step);
  }, []);

  const stepState = useCallback(
    (step: StepId): 'active' | 'done' | 'pending' => {
      if (step === activeStep) return 'active';
      if (completed[step]) return 'done';
      return 'pending';
    },
    [activeStep, completed]
  );

  /** Recomeça do zero (link vencido): nova sessão, mantendo o que já foi digitado. */
  const startOver = useCallback(() => {
    hydratedRef.current = true; // preserva o que a pessoa já digitou nesta visita
    selectionHydratedRef.current = false;
    pendingRef.current = {};
    tokenRef.current = null;
    setExpired(false);
    setSessionError(null);
    setResult(null);
    setSession(null);
    // Cobrança da sessão antiga não vale para a nova — inclusive o rascunho do
    // cartão, que não deve sobreviver a uma troca de sessão.
    setPayment(null);
    setPaymentError(null);
    setCard(emptyCard());
    setCardErrors({});
    // A sessão nova nasce mensal no servidor; o desejo de anual da sessão antiga
    // não pode sobreviver aqui e ressurgir como um "anual" marcado sobre um
    // `amountCents` mensal. Quem quiser o anual clica de novo.
    setIntervalWish('monthly');
    setAnnualDropped(false);
    setCompleted({ identify: false, plan: false, payment: false });
    setActiveStep('identify');
    setForceCreate(true);
    setSessionAttempt((attempt) => attempt + 1);
    // Sessão nova é outro funil: os eventos de dinheiro voltam a poder sair, e
    // o `eventID` do `Purchase` da sessão anterior não pode ser reaproveitado
    // (o servidor confirmaria uma compra com o id de outra contratação).
    beginTrackedRef.current = false;
    paymentInfoTrackedRef.current = new Set();
    purchaseEventIdRef.current = null;
    purchaseTrackedRef.current = false;
  }, []);

  const retryCatalog = useCallback(() => setCatalogAttempt((attempt) => attempt + 1), []);
  const retrySession = useCallback(() => setSessionAttempt((attempt) => attempt + 1), []);

  /**
   * Pagamento online concluído, traduzido para o formato do fluxo antigo.
   *
   * Existe por um motivo prático: `CheckoutPage` usa `result` para esconder a
   * barra fixa do rodapé quando não há mais nada a fazer. Sem este espelho, a
   * barra continuaria oferecendo "Concluir" depois de a conta já estar
   * liberada. O `PaymentStep` olha `payment` ANTES de `result`, então quem
   * desenha a tela de sucesso é sempre o resultado real da cobrança.
   */
  const onlineResult: CheckoutPaymentResult | null = payment?.paid
    ? {
        status: 'paid',
        gateway: payment.provider,
        nextStep: 'acesso-liberado',
        // `charged` é o que a tela usa para dizer "nada foi cobrado": num
        // provedor simulado nenhum valor saiu da conta de ninguém.
        charged: !payment.simulated,
        message: payment.message,
      }
    : null;

  return {
    // dados
    catalog,
    plans,
    policy: catalog?.billingPolicy ?? null,
    session,
    selectedPlan,
    planCode,
    screens,
    identity,
    identityErrors,
    focusRequest,
    result: result ?? onlineResult,

    // pagamento
    paymentConfig,
    paymentConfigError,
    paymentMethods: paymentConfig?.methods ?? [],
    simulatedPayment: paymentConfig?.simulated === true,
    canPayOnline,
    paymentMethod,
    card,
    cardErrors,
    payment,
    paymentError,
    paying,
    confirmingPix,

    // estados de carga/erro
    catalogError,
    sessionError,
    expired,
    booting: !session && !sessionError && !expired,
    catalogLoading: !catalog && !catalogError,
    amountSyncing,
    syncFailed,
    savingIdentity,
    savingPlan,
    submitting,

    // passos
    activeStep,
    completed,
    stepState,
    editStep,

    // valores
    totalCents,
    /** Intervalo em exibição — o do servidor, exceto durante o PATCH. */
    billingInterval,
    /** `false` = plano sem oferta anual: o seletor não aparece. */
    annualAvailable,
    /** `true` = o anual pedido não cabe no plano escolhido; a tela explica. */
    annualDropped,
    /** Economia do anual em % inteiros. `0` = não existe economia a anunciar. */
    annualSavings,
    unitCents,
    yearCents,
    alreadySubmitted: !!session?.paymentAt,
    concluded: session?.status === 'paid',

    // ações
    retryCatalog,
    retrySession,
    startOver,
    choosePlan,
    chooseInterval,
    changeScreens,
    retrySync,
    setIdentityField,
    setMarketingOptIn,
    setDocumentKind,
    blurIdentityField,
    submitIdentify,
    confirmPlan,
    finish,
    planError,

    // medição
    /** Dispara o `Purchase` (navegador). Chamado pela tela de obrigado. */
    trackPurchaseNow,

    // ações de pagamento
    selectPaymentMethod,
    setCardField,
    blurCardField,
    fillTestCard,
    payWith,
    confirmSimulated,
    resetPayment,
  };
}

export type CheckoutController = ReturnType<typeof useCheckout>;
