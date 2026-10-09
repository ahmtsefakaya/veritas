const DEFAULT_API = 'https://veritas-production-aa2b.up.railway.app';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API;

export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}) as Record<string, unknown>);
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : (data.message as string) || 'Bir hata olustu.';
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

/** Kalite puanini olusturan bes bilesen. Kullanici oylari bu puana girmez. */
export interface QualityBreakdown {
  sourceReliability: number;
  verifiability: number;
  relevance: number;
  specificity: number;
  timeliness: number;
}

export interface Evidence {
  id: string;
  content: string;
  sourceUrl: string | null;
  score: number | null;
  aiReasoning: string | null;
  qualityBreakdown: QualityBreakdown | null;
  voteScore: number;
  voteCount: number;
  myVote: number;
  reportCount: number;
  myReported: boolean;
  author: { username: string; displayName: string | null };
}

export interface Side {
  id: string;
  position: 'A' | 'B';
  label: string;
  evidences: Evidence[];
  totalScore: number;
  averageScore: number | null;
  strengthScore: number | null;
  evidenceCount: number;
  scoredCount: number;
}

export interface TopicSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  leadingSideId: string | null;
  isTie: boolean;
  sides: Pick<Side, 'id' | 'position' | 'label' | 'strengthScore' | 'evidenceCount'>[];
}

export interface TopicDetail extends TopicSummary {
  sides: Side[];
}

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}
