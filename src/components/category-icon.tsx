import {
  Activity,
  Binary,
  BookOpen,
  Box,
  Brush,
  Cloud,
  Code2,
  Container,
  Database,
  FileJson,
  FileText,
  FlaskConical,
  GitBranch,
  Image,
  LayoutTemplate,
  PenTool,
  Pipette,
  Plug,
  Regex,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Table2,
  Terminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Code2,
  LayoutTemplate,
  Server,
  Plug,
  FileJson,
  Database,
  Table2,
  Regex,
  Binary,
  ShieldCheck,
  GitBranch,
  Container,
  Cloud,
  Sparkles,
  PenTool,
  Brush,
  Pipette,
  Image,
  FileText,
  FlaskConical,
  Activity,
  Smartphone,
  BookOpen,
  Terminal,
  Wrench,
};

export function CategoryIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Box;
  return <Icon className={className} aria-hidden />;
}
