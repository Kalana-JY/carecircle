import { apiFetch } from './api';

type ListResponse<T> = { items: T[]; meta?: Record<string, unknown> };

export type CrisisEntryType = 'hospital' | 'counselor' | 'organization' | 'helpline';

export type CrisisEntry = {
  _id: string;
  name: string;
  type: CrisisEntryType;
  description?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  hours?: string;
  languages?: string[];
  services?: string[];
  isEmergency?: boolean;
  is24Hours?: boolean;
  isPublished?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number;
  saved?: boolean;
};

export type PersonalCrisisContact = {
  _id: string;
  name: string;
  phone: string;
  relationship?: string;
};

export type CrisisDirections = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string;
  appleMapsUrl: string;
  geoUri: string | null;
};

export type HelpNowResponse = {
  guidance: {
    headline: string;
    message: string;
    emergencyNumber: string | null;
  };
  helplines: CrisisEntry[];
  nearby: CrisisEntry[];
};

export type CrisisEntryPayload = {
  name: string;
  type: CrisisEntryType;
  description?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  hours?: string;
  isEmergency?: boolean;
  is24Hours?: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const crisisSupportApi = {
  list: (params: { type?: string; q?: string; includeUnpublished?: boolean } = {}) =>
    apiFetch<ListResponse<CrisisEntry>>(`/api/crisis-support${qs({
      type: params.type,
      q: params.q,
      includeUnpublished: params.includeUnpublished ? 'true' : undefined,
    })}`),
  nearby: (lat: number, lng: number, radiusKm = 25) =>
    apiFetch<ListResponse<CrisisEntry>>(`/api/crisis-support/nearby${qs({ lat, lng, radiusKm })}`),
  helplines: () => apiFetch<ListResponse<CrisisEntry>>('/api/crisis-support/helplines'),
  helpNow: (lat?: number, lng?: number) =>
    apiFetch<HelpNowResponse>(`/api/crisis-support/help-now${qs({ lat, lng })}`),
  directions: (id: string, lat?: number, lng?: number) =>
    apiFetch<CrisisDirections>(`/api/crisis-support/${id}/directions${qs({ lat, lng })}`),
  saved: () => apiFetch<ListResponse<CrisisEntry>>('/api/crisis-support/saved'),
  toggleSave: (id: string) =>
    apiFetch<{ message: string; saved: boolean; items: CrisisEntry[] }>(`/api/crisis-support/${id}/save`, { method: 'POST' }),
  create: (entry: CrisisEntryPayload) =>
    apiFetch<{ message: string; entry: CrisisEntry }>('/api/crisis-support', { method: 'POST', body: entry }),
  update: (id: string, entry: Partial<CrisisEntryPayload>) =>
    apiFetch<{ message: string; entry: CrisisEntry }>(`/api/crisis-support/${id}`, { method: 'PUT', body: entry }),
  remove: (id: string) =>
    apiFetch<{ message: string }>(`/api/crisis-support/${id}`, { method: 'DELETE' }),
  personalContacts: () =>
    apiFetch<ListResponse<PersonalCrisisContact>>('/api/crisis-support/personal-contacts'),
  addPersonalContact: (contact: { name: string; phone: string; relationship?: string }) =>
    apiFetch<{ message: string; contact: PersonalCrisisContact; items: PersonalCrisisContact[] }>(
      '/api/crisis-support/personal-contacts',
      { method: 'POST', body: contact }
    ),
  removePersonalContact: (contactId: string) =>
    apiFetch<{ message: string; items: PersonalCrisisContact[] }>(
      `/api/crisis-support/personal-contacts/${contactId}`,
      { method: 'DELETE' }
    ),
};
