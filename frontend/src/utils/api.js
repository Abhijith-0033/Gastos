import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname.startsWith('/developer') || window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error) {
  if (error.response?.data?.errors) {
    return error.response.data.errors.map((e) => e.msg).join(', ');
  }
  return error.response?.data?.error || error.message || 'Something went wrong. Please try again.';
}

// Auth API
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  checkUsername: (username) => api.get(`/auth/check-username?username=${encodeURIComponent(username)}`),
  checkPackage: (pkg) => api.get(`/auth/check-package?package_name=${encodeURIComponent(pkg)}`),
};

// Public Apps API
export const appsApi = {
  list: (params) => api.get('/apps', { params }),
  featured: () => api.get('/apps/featured'),
  newReleases: () => api.get('/apps/new-releases'),
  topDownloads: () => api.get('/apps/top-downloads'),
  editorsChoice: () => api.get('/apps/editors-choice'),
  detail: (slug) => api.get(`/apps/${slug}`),
  reviews: (slug, params) => api.get(`/apps/${slug}/reviews`, { params }),
  downloadUrl: (slug) => `${import.meta.env.VITE_API_URL || '/api/v1'}/apps/${slug}/download`,
  categories: () => api.get('/apps/meta/categories'),
  search: (q) => api.get(`/apps/meta/search?q=${encodeURIComponent(q)}`),
};

// Reviews API
export const reviewsApi = {
  submit: (appSlug, data) => api.post(`/reviews/${appSlug}`, data),
  markHelpful: (id) => api.post(`/reviews/${id}/helpful`),
};

// Developer Portal API
export const developerApi = {
  dashboard: () => api.get('/developer/dashboard'),
  apps: () => api.get('/developer/apps'),
  appDetail: (id) => api.get(`/developer/apps/${id}`),
  submitApp: (formData) =>
    api.post('/developer/apps', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  submitVersion: (appId, formData) =>
    api.post(`/developer/apps/${appId}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  analytics: (appId) => api.get(`/developer/analytics/${appId}`),
  notifications: () => api.get('/developer/notifications'),
  markNotificationRead: (id) => api.put(`/developer/notifications/${id}/read`),
  markAllRead: () => api.put('/developer/notifications/read-all'),
};

// Public Developers API
export const developersApi = {
  profile: (username) => api.get(`/developers/${username}`),
};

// Admin API
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  apps: (params) => api.get('/admin/apps', { params }),
  pendingApps: () => api.get('/admin/apps/pending'),
  appDetail: (id) => api.get(`/admin/apps/${id}`),
  approveApp: (id, data) => api.put(`/admin/apps/${id}/approve`, data),
  rejectApp: (id, data) => api.put(`/admin/apps/${id}/reject`, data),
  suspendApp: (id, data) => api.put(`/admin/apps/${id}/suspend`, data),
  featureApp: (id) => api.put(`/admin/apps/${id}/feature`),
  editorsChoice: (id) => api.put(`/admin/apps/${id}/editors-choice`),
  deleteApp: (id) => api.delete(`/admin/apps/${id}`),
  pendingVersions: () => api.get('/admin/versions/pending'),
  approveVersion: (id) => api.put(`/admin/versions/${id}/approve`),
  rejectVersion: (id, data) => api.put(`/admin/versions/${id}/reject`, data),
  users: (params) => api.get('/admin/users', { params }),
  toggleUserActive: (id) => api.put(`/admin/users/${id}/toggle-active`),
  changeUserRole: (id, role) => api.put(`/admin/users/${id}/change-role`, { role }),
  reviews: (params) => api.get('/admin/reviews', { params }),
  updateReviewStatus: (id, status) => api.put(`/admin/reviews/${id}/status`, { status }),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`),
  respondToReview: (id, response) => api.post(`/admin/reviews/${id}/respond`, { response }),
  downloads: () => api.get('/admin/downloads'),
  settings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  actions: (params) => api.get('/admin/actions', { params }),
};

export default api;
