import { apiFetch } from './api';

type ListResponse<T> = { items: T[]; meta?: Record<string, unknown> };

export type ResourceType = 'article' | 'video' | 'self-help-guide';

export type ResourceStep = {
  title: string;
  body?: string;
  order?: number;
};

export type ResourceReview = {
  _id?: string;
  rating: number;
  comment?: string;
  user?: { name?: string } | string;
  createdAt?: string;
};

export type MentalHealthResource = {
  _id: string;
  title: string;
  description?: string;
  content?: string;
  url?: string;
  category?: string;
  topics?: string[];
  type: ResourceType | string;
  tags?: string[];
  source?: string;
  author?: string;
  durationMinutes?: number;
  steps?: ResourceStep[];
  isPublished?: boolean;
  averageRating?: number;
  ratingsCount?: number;
  bookmarked?: boolean;
  reviews?: ResourceReview[];
};

export type ResourceFilters = {
  types: string[];
  categories: string[];
  topics: string[];
};

export type ResourcePayload = {
  title: string;
  type: ResourceType;
  description?: string;
  content?: string;
  url?: string;
  category?: string;
  topics?: string[];
  steps?: ResourceStep[];
  isPublished?: boolean;
  author?: string;
  source?: string;
  durationMinutes?: number;
};

export type SharePayload = {
  method: 'link' | 'email' | 'sms';
  sharedWith?: string;
  title: string;
  description: string;
  shareUrl: string;
  text: string;
};

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const resourceApi = {
  list: (params: { q?: string; category?: string; topic?: string; type?: string; includeUnpublished?: boolean } = {}) =>
    apiFetch<ListResponse<MentalHealthResource>>(`/api/resources${qs({
      q: params.q,
      category: params.category,
      topic: params.topic,
      type: params.type,
      includeUnpublished: params.includeUnpublished ? 'true' : undefined,
    })}`),
  get: (id: string) => apiFetch<MentalHealthResource>(`/api/resources/${id}`),
  filters: () => apiFetch<ResourceFilters>('/api/resources/filters'),
  bookmarks: () => apiFetch<ListResponse<MentalHealthResource>>('/api/resources/bookmarks'),
  toggleBookmark: (id: string) =>
    apiFetch<{ message: string; bookmarked: boolean }>(`/api/resources/${id}/bookmark`, { method: 'POST' }),
  recommendations: () =>
    apiFetch<ListResponse<MentalHealthResource> & { meta?: { basedOn?: { categories?: string[]; topics?: string[]; activities?: string[] } } }>(
      '/api/resources/recommendations'
    ),
  reviews: (id: string) =>
    apiFetch<{ items: ResourceReview[]; meta?: { averageRating?: number; ratingsCount?: number } }>(`/api/resources/${id}/reviews`),
  addReview: (id: string, rating: number, comment: string) =>
    apiFetch<{ message: string; averageRating: number; ratingsCount: number; reviews: ResourceReview[] }>(
      `/api/resources/${id}/reviews`,
      { method: 'POST', body: { rating, comment } }
    ),
  share: (id: string, method: SharePayload['method'], sharedWith?: string) =>
    apiFetch<{ message: string; share: SharePayload }>(`/api/resources/${id}/share`, {
      method: 'POST',
      body: { method, sharedWith },
    }),
  create: (resource: ResourcePayload) =>
    apiFetch<{ message: string; resource: MentalHealthResource }>('/api/resources', { method: 'POST', body: resource }),
  update: (id: string, resource: Partial<ResourcePayload>) =>
    apiFetch<{ message: string; resource: MentalHealthResource }>(`/api/resources/${id}`, { method: 'PUT', body: resource }),
  remove: (id: string) => apiFetch<{ message: string }>(`/api/resources/${id}`, { method: 'DELETE' }),
};

export const resourceTypeLabel = (type?: string) => {
  switch (type) {
    case 'article':
      return 'Article';
    case 'video':
      return 'Video';
    case 'self-help-guide':
      return 'Self-help guide';
    default:
      return type || 'Resource';
  }
};
