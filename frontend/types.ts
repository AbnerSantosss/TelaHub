
export enum WidgetType {
  IMAGE = 'IMAGE',
  TEXT = 'TEXT',
  IFRAME = 'IFRAME',
  WEATHER = 'WEATHER',
  CLOCK = 'CLOCK',
  VIDEO = 'VIDEO',
  RSS = 'RSS',
  CALENDAR = 'CALENDAR',
  GIF = 'GIF',
  FULL_INFO = 'FULL_INFO',
  NOTES = 'NOTES',
  TODO = 'TODO',
  COUNTDOWN = 'COUNTDOWN',
  CHORES = 'CHORES',
  MEAL_PLAN = 'MEAL_PLAN',
  MARKET_WATCH = 'MARKET_WATCH',
  BROWSER_SNAPSHOT = 'BROWSER_SNAPSHOT',
  GOOGLE_DOCS = 'GOOGLE_DOCS',
  OFFICE_DOCS = 'OFFICE_DOCS',
  POWER_BI = 'POWER_BI',
  EMBED_HTML = 'EMBED_HTML',
  AIRTABLE = 'AIRTABLE',
  PDF_DOCUMENT = 'PDF_DOCUMENT'
}

export interface RssFeedConfig {
  url: string;
  category?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderWidth?: string;
  borderRadius?: string;
  borderColor?: string;
}

export interface WidgetData {
  url?: string;
  videoUrl?: string;
  rssUrl?: string; // URL do Feed RSS (mantido para compatibilidade)
  rssFeeds?: RssFeedConfig[]; // Novo campo para múltiplos feeds
  calendarId?: string; // ID do Google Calendar
  content?: string;
  color?: string;
  fontSize?: string;
  city?: string;
  width?: string; // Image width in px
  height?: string; // Image height in px
  model?: string; // 'simple', 'detailed', 'minimal', etc.
  videoConfig?: {
    autoplay?: boolean;
    mute?: boolean;
    loop?: boolean;
    controls?: boolean;
    youtubeQuality?: string;
  };
  calendarConfig?: {
    transparent?: boolean;
    backgroundColor?: string;
    theme?: 'light' | 'dark' | 'glass' | 'minimal' | 'neon' | 'card';
    customTitle?: string;
    showTitle?: boolean;
    titleColor?: string;
    titleSize?: string;
  };
  imageConfig?: {
    objectFit?: 'cover' | 'contain' | 'fill';
    scale?: number;
  };
  iframeConfig?: {
    interactive?: boolean;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  };
  rssConfig?: {
    layout?: 'full-image' | 'split' | 'ticker';
    feedMode?: 'default' | 'require-image' | 'text-only'; // Novo modo de feed
    showImage?: boolean; // Mantido para retrocompatibilidade
    fontSize?: string;
    showFullContent?: boolean;
    enableMarquee?: boolean;
    marqueeSpeed?: number;
    fontFamily?: string;
    textColor?: string;
    titleColor?: string;
    titleSize?: string;
    descriptionSize?: string;
  };
  scale?: number; // General scale factor for the widget content
  backgroundImage?: string; // Background image for the widget
  weatherConfig?: {
    baseFontSize?: string; // e.g., '1cqw' or '16px' - controls the scale of the whole widget
    showCityImage?: boolean;
  };
  textConfig?: {
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string; // 'normal', 'bold', '100'-'900'
    fontStyle?: string; // 'normal', 'italic'
    textAlign?: 'left' | 'center' | 'right';
    animation?: 'none' | 'fade' | 'slide' | 'typewriter' | 'pulse' | 'bounce';
  };
  backgroundAnimation?: 'none' | 'auto-weather' | 'gradient-flow' | 'clouds' | 'rain' | 'snow' | 'fire' | 'tech-grid' | 'pulse-red' | 'pulse-blue' | 'pulse-green' | 'aurora';
  transparentBackground?: boolean;
  backgroundColor?: string;
  textSize?: number;
  numberSize?: number;
  zIndex?: number; // Added to handle layering/overlapping
  notesConfig?: {
    fontFamily?: string;
    fontSize?: string;
    textColor?: string;
    backgroundColor?: string;
    paperTheme?: 'glass' | 'yellow-sticky' | 'purple-haze' | 'neon-glow';
  };
  todoConfig?: {
    title?: string;
    items: { id: string; text: string; done: boolean }[];
  };
  countdownConfig?: {
    title?: string;
    targetDate: string;
    expiredMessage?: string;
    theme?: 'neon' | 'glass' | 'minimal' | 'bold-gradient';
  };
  choresConfig?: {
    title?: string;
    items: { id: string; chore: string; assignee: string; day?: string; done?: boolean }[];
  };
  mealPlanConfig?: {
    title?: string;
    days: {
      [day: string]: {
        breakfast?: string;
        lunch?: string;
        dinner?: string;
        snacks?: string;
      }
    };
  };
  marketWatchConfig?: {
    title?: string;
    symbols: string[];
    layout?: 'grid' | 'list' | 'ticker';
  };
  browserSnapshotConfig?: {
    url: string;
    updateIntervalMinutes?: number;
  };
  googleDocsConfig?: {
    url: string;
    docType: 'document' | 'spreadsheet' | 'presentation' | 'form';
  };
  officeDocsConfig?: {
    url: string;
    docType: 'word' | 'excel' | 'powerpoint';
  };
  powerBiConfig?: {
    embedUrl: string;
  };
  embedWebsiteConfig?: {
    url: string;
    interactive?: boolean;
  };
  embedHtmlConfig?: {
    html: string;
  };
  airtableConfig?: {
    shareUrl: string;
  };
  pdfDocumentConfig?: {
    pdfUrl: string;
  };
  fillContainer?: boolean;
  autoSize?: boolean;
  contentAlignment?: 'start' | 'center' | 'end' | 'stretch';
  padding?: string;
  margin?: string;
  fullScreenMode?: boolean;
  fitContainerMode?: 'none' | 'cover' | 'contain' | 'stretch';
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: WidgetType;
  data: WidgetData;
}

export interface Page {
  id: string;
  order: number;
  duration: number; // in seconds
  layout: LayoutItem[];
  backgroundImage?: string;
  backgroundVideoUrl?: string; // New property for full-screen video background
  backgroundVideoMuted?: boolean;
  backgroundVideoQuality?: string; // e.g., 'highres', 'hd1080', 'hd720', 'large', 'medium', 'small'
  backgroundAnimation?: 'none' | 'auto-weather' | 'gradient-flow' | 'clouds' | 'rain' | 'snow' | 'fire' | 'tech-grid' | 'pulse-red' | 'pulse-blue' | 'pulse-green' | 'aurora';
  backgroundFit?: 'cover' | 'contain' | 'fill';
  transitionType?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down';
  transitionDuration?: number; // in ms
  broadcast_id?: string;
  start_time?: string;
  end_time?: string;
  is_permanent?: boolean;
}

export interface Device {
  id: string;
  pairing_code: string;
  display_id: string | null;
  status: 'pending' | 'linked';
  last_seen: number;
  online: boolean;
  name?: string;
  organizationId?: string | null;
}

export interface Display {
  id: string;
  name: string;
  slug: string;
  pages: Page[];
  updatedAt: number;
  coverImage?: string;
  orientation?: 'horizontal' | 'vertical';
  organizationId?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

// ==============================================================================
// BILLING / SaaS
// ==============================================================================

export type PlanInterval = 'month' | 'year';

/** Plano comercial devolvido por `GET /api/plans` (rota pública). */
export interface Plan {
  id: string;
  name: string;
  slug?: string;
  /** Preço em centavos (0 = gratuito/trial). */
  priceCents: number;
  currency?: string;
  interval?: PlanInterval;
  /** Limites do plano — `null` significa ilimitado. */
  maxDisplays?: number | null;
  maxDevices?: number | null;
  maxUsers?: number | null;
  maxOrganizations?: number | null;
  features?: string[];
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

/** Consumo atual da organização, para comparar com os limites do plano. */
export interface SubscriptionUsage {
  displays: number;
  devices: number;
  users: number;
  organizations?: number;
}

export interface Subscription {
  id: string;
  organizationId: string;
  status: SubscriptionStatus;
  /** Plano associado. Pode vir ausente se o backend só mandar `planId`. */
  plan?: Plan | null;
  planId?: string;
  planName?: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  createdAt?: string;
  canceledAt?: string | null;
}

/** Resposta de `GET /api/billing/subscription`. */
export interface SubscriptionState {
  subscription: Subscription;
  usage: SubscriptionUsage;
  /** Dias restantes de trial. `null`/ausente quando não está em trial. */
  trialDaysRemaining?: number | null;
}

/** Corpo enviado para `POST /api/signup`. */
export interface SignupPayload {
  companyName: string;
  name: string;
  email: string;
  password: string;
}

/** Resposta de `POST /api/signup` — mesmo formato do login. */
export interface SignupResponse {
  token: string;
  user: User;
}

export interface OrganizationReport {
  organizationId: string;
  displaysCount: number;
  devicesOnline: number;
  devicesOffline: number;
  broadcastsCount: number;
  period: { startDate: string | null; endDate: string | null };
}

export interface User {
  id: string;
  username: string;
  name?: string;
  email?: string; // Novo campo para login robusto
  role: 'master' | 'admin' | 'user';
  lastLogin?: string | null; // null = nunca acessou
  /** Organização (tenant) à qual o usuário pertence. `master` opera acima dos tenants. */
  organizationId?: string | null;
  // Senha removida da interface frontend por segurança
}

export interface Broadcast {
  id: string;
  name: string;
  page: Page;
  start_time: string; // ISO string
  end_time: string; // ISO string
  is_permanent?: boolean;
  display_ids: string[]; // Targeted displays
  active: boolean;
  created_at: number;
  created_by?: string;
  orientation?: 'horizontal' | 'vertical';
  organizationId?: string | null;
}
