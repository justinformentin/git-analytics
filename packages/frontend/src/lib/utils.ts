import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export function getReadinessBadgeVariant(category?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (category) {
    case 'ready': return 'default';
    case 'needs_review': return 'secondary';
    case 'blocked': return 'destructive';
    default: return 'outline';
  }
}

export function getReadinessColor(category?: string): string {
  switch (category) {
    case 'ready': return 'text-emerald-400';
    case 'needs_review': return 'text-amber-400';
    case 'blocked': return 'text-red-400';
    default: return 'text-muted-foreground';
  }
}

export function getReadinessLabel(category?: string): string {
  switch (category) {
    case 'ready': return 'Ready';
    case 'needs_review': return 'Needs Review';
    case 'blocked': return 'Blocked';
    default: return 'Unknown';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

export function shortenSha(sha: string): string {
  return sha.slice(0, 7);
}
