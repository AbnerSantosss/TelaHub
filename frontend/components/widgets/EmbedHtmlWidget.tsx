import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CloudSun, Rss, Monitor, Loader2, Home, ChevronRight, MoreHorizontal, ChevronLeft, 
  Cloud, CloudRain, CloudLightning, Snowflake, Sun, Search, Map,
  StickyNote, ListTodo, Hourglass, ClipboardList, Utensils, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Globe, FileText, Code2, Database, Layers, CheckSquare,
  Gift, CheckCircle2, Tv, FileImage, Check, Copy, ExternalLink, Calendar, CalendarDays,
  Pencil, Trash2, X, Settings, Image as ImageIcon, BookOpen, BarChart3, Aperture,
  ArrowUp, ArrowDown, Play, Pause, Square, Power, CheckSquare as CheckSquareIcon,
  Hourglass as HourglassIcon, User, Users, Lock, Shield, Eye, EyeOff, Info, HelpCircle,
  Menu, ChevronDown, CheckCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, ComposedChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { getAlignmentClasses } from '../Player';

// Import Recharts parts to make sure they are accessible (recharts does not default export AreaChart sometimes)
// If Recharts has specific issues, importing them directly as named works in Vite.

export const EmbedHtmlWidget: React.FC<{ data: any }> = ({ data }) => {
  const config = data.embedHtmlConfig || { html: '' };
  const html = config.html || '<div style="color: white; font-family: sans-serif; text-align: center; padding: 20px;">Cole seu código HTML customizado aqui.</div>';

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-black/10 flex items-center justify-center">
      <iframe 
        srcDoc={html} 
        className="w-full h-full border-none bg-transparent"
        title="Custom HTML Embed"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

// ==========================================
// 9. GOOGLE DOCS WIDGET
