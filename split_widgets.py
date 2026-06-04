import os
import re

player_path = r"c:\Users\binho\Downloads\Projetos de IA\Display - Vendas\TelaHub\frontend\components\Player.tsx"
output_dir = r"c:\Users\binho\Downloads\Projetos de IA\Display - Vendas\TelaHub\frontend\components\widgets"

os.makedirs(output_dir, exist_ok=True)

with open(player_path, "r", encoding="utf-8") as f:
    content = f.read()

# Define the widgets we want to extract
widgets = [
    ("LiveClock", "LiveClock"),
    ("RssFeed", "RssFeed"),
    ("WeatherWidget", "WeatherWidget"),
    ("FullInfoWidget", "FullInfoWidget"),
    ("NotesWidget", "NotesWidget"),
    ("TodoWidget", "TodoWidget"),
    ("CountdownWidget", "CountdownWidget"),
    ("ChoresWidget", "ChoresWidget"),
    ("MealPlanWidget", "MealPlanWidget"),
    ("MarketWatchWidget", "MarketWatchWidget"),
    ("BrowserSnapshotWidget", "BrowserSnapshotWidget"),
    ("EmbedHtmlWidget", "EmbedHtmlWidget"),
    ("GoogleDocsWidget", "GoogleDocsWidget"),
    ("OfficeDocsWidget", "OfficeDocsWidget"),
    ("PowerBIWidget", "PowerBIWidget"),
    ("AirtableWidget", "AirtableWidget"),
    ("PdfDocumentWidget", "PdfDocumentWidget"),
]

# Find positions
positions = []
for name, _ in widgets:
    # Match: export const Name: React.FC
    pattern = rf"export\s+const\s+{name}\b"
    matches = list(re.finditer(pattern, content))
    if matches:
        positions.append((name, matches[0].start()))

positions.sort(key=lambda x: x[1])

# Extract each widget
for i, (name, start_idx) in enumerate(positions):
    end_idx = positions[i+1][1] if i + 1 < len(positions) else len(content)
    widget_code = content[start_idx:end_idx].strip()
    
    # We need to clean up comments or trailing delimiters
    # Remove training dividers like "// ==========================================" at the end
    widget_code = re.sub(r"\s*//\s*={5,}\s*$", "", widget_code)
    widget_code = re.sub(r"\s*//\s*={5,}\s*\d+\.\s+\w+\s+WIDGET\s*//\s*={5,}\s*$", "", widget_code)
    
    # Prepare the file content
    file_content = f"""import React, { { useState, useEffect, useRef, useMemo } } from 'react';
import { 
  CloudSun, Rss, Monitor, Loader2, Home, ChevronRight, MoreHorizontal, ChevronLeft, 
  Cloud, CloudRain, CloudLightning, Snowflake, Sun, Search, Map,
  StickyNote, ListTodo, Hourglass, ClipboardList, Utensils, TrendingUp, TrendingDown, 
  ArrowUpRight, ArrowDownRight, Globe, FileText, Code2, Database, Layers, CheckSquare,
  Gift, CheckCircle2, Tv, FileImage, Check, Copy, ExternalLink, Calendar, CalendarDays,
  Pencil, Trash2, X, Settings, Image as ImageIcon, BookOpen, BarChart3, Aperture
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, ComposedChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { getAlignmentClasses } from '../Player';

{widget_code}
"""
    
    output_file = os.path.join(output_dir, f"{name}.tsx")
    with open(output_file, "w", encoding="utf-8") as out:
        out.write(file_content)
    print(f"Created: {name}.tsx")

print("Done splitting widgets!")
