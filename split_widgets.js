const fs = require('fs');
const path = require('path');

const playerPath = path.resolve(__dirname, 'frontend', 'components', 'Player.tsx');
const outputDir = path.resolve(__dirname, 'frontend', 'components', 'widgets');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const content = fs.readFileSync(playerPath, 'utf8');

const widgets = [
  "LiveClock",
  "RssFeed",
  "WeatherWidget",
  "FullInfoWidget",
  "NotesWidget",
  "TodoWidget",
  "CountdownWidget",
  "ChoresWidget",
  "MealPlanWidget",
  "MarketWatchWidget",
  "BrowserSnapshotWidget",
  "EmbedHtmlWidget",
  "GoogleDocsWidget",
  "OfficeDocsWidget",
  "PowerBIWidget",
  "AirtableWidget",
  "PdfDocumentWidget"
];

// Find matches and sort them
const positions = [];
widgets.forEach(name => {
  const regex = new RegExp(`export\\s+const\\s+${name}\\b`, 'g');
  const match = regex.exec(content);
  if (match) {
    positions.push({ name, start: match.index });
  }
});

positions.sort((a, b) => a.start - b.start);

// Extract and write
positions.forEach((pos, idx) => {
  const end = (idx + 1 < positions.length) ? positions[idx + 1].start : content.length;
  let code = content.substring(pos.start, end).trim();

  // Clean trailing divider comments
  code = code.replace(/\s*\/\/\s*={5,}\s*$/, '');
  code = code.replace(/\s*\/\/\s*={5,}\s*\d+\.\s+\w+\s+WIDGET\s*\/\/\s*={5,}\s*$/, '');

  const fileContent = `import React, { useState, useEffect, useRef, useMemo } from 'react';
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

${code}
`;

  const outputPath = path.join(outputDir, `${pos.name}.tsx`);
  fs.writeFileSync(outputPath, fileContent, 'utf8');
  console.log(`Created widget component: ${pos.name}.tsx`);
});

console.log("Done splitting widgets successfully!");
