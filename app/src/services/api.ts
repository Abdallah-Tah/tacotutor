import axios from 'axios';
import { buildApiPath, buildApiUrl, withBasePath } from '@/lib/paths';

const API_BASE = (import.meta as any).env?.VITE_API_URL || buildApiPath('');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.assign(withBasePath('/login'));
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  signup: (email: string, password: string, displayName?: string) =>
    api.post('/auth/signup', { email, password, display_name: displayName }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { username: email, password }),
  googleAuth: (token: string) =>
    api.post('/auth/google', { token }),
  me: () =>
    api.get('/auth/me'),
};

export const userAPI = {
  createChild: (data: { name: string; age?: number; avatar_color?: string }) =>
    api.post('/users/children', data),
  listChildren: () =>
    api.get('/users/children'),
  getChild: (childId: string) =>
    api.get(`/users/children/${childId}`),
  deleteChild: (childId: string) =>
    api.delete(`/users/children/${childId}`),
  getProfile: (childId: string) =>
    api.get(`/users/children/${childId}/profile`),
  updateProfile: (childId: string, data: any) =>
    api.patch(`/users/children/${childId}/profile`, data),
  getProgress: (childId: string) =>
    api.get(`/users/children/${childId}/progress`),
};

export const lessonAPI = {
  list: (subject?: string, level?: number) =>
    api.get('/lessons', { params: { subject, level } }),
  get: (lessonId: string) =>
    api.get(`/lessons/${lessonId}`),
  assign: (childId: string, lessonId: string) =>
    api.post('/lessons/assign', { child_id: childId, lesson_id: lessonId }),
  getAssignments: (childId: string, status?: string) =>
    api.get(`/lessons/child/${childId}/assignments`, { params: { status } }),
  updateAssignment: (assignmentId: string, status: string) =>
    api.patch(`/lessons/assignments/${assignmentId}`, { status }),
};

export const sessionAPI = {
  start: (childId: string, lessonId?: string) =>
    api.post('/sessions/start', { child_id: childId, lesson_id: lessonId }),
  end: (sessionId: string) =>
    api.post(`/sessions/${sessionId}/end`),
  list: (childId: string) =>
    api.get(`/sessions/child/${childId}`),
  get: (sessionId: string) =>
    api.get(`/sessions/${sessionId}`),
  parentDashboard: () =>
    api.get('/sessions/dashboard/parent'),
  kidDashboard: (childId: string) =>
    api.get(`/sessions/dashboard/kid/${childId}`),
};

export const instructionAPI = {
  list: (childId?: string, lessonId?: string) =>
    api.get('/instructions', { params: { child_id: childId, lesson_id: lessonId } }),
  create: (data: { name: string; content: string; child_id?: string; lesson_id?: string }) =>
    api.post('/instructions', data),
  get: (instructionId: string) =>
    api.get(`/instructions/${instructionId}`),
  update: (instructionId: string, data: any) =>
    api.patch(`/instructions/${instructionId}`, data),
  delete: (instructionId: string) =>
    api.delete(`/instructions/${instructionId}`),
};

export const realtimeAPI = {
  transcribe: (audioBlob: Blob, language: string = 'auto') => {
    const fd = new FormData();
    fd.append('audio', audioBlob, 'recording.webm');
    fd.append('language', language);
    return api.post('/realtime/transcribe', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  audioUrl: (audioName: string) => buildApiUrl(`/realtime/audio/${audioName}`),
};
