import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Use full URL instead of relative path
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Add Bearer prefix
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getEmergencyContacts: () => api.get('/auth/emergency-contacts'),
  addEmergencyContact: (contact) => api.post('/auth/add-emergency-contact', contact),
  removeEmergencyContact: (contactId) => api.delete(`/auth/remove-emergency-contact/${contactId}`),
};

export const sosAPI = {
  trigger: (location) => api.post('/sos/trigger', location),
  getActive: () => api.get('/sos/active'),
  resolve: (alertId) => api.patch(`/sos/resolve/${alertId}`),
};

export const tripAPI = {
  start: (tripData) => api.post('/trip/start', tripData),
  updateLocation: (tripId, location) => api.patch(`/trip/update-location/${tripId}`, location),
  complete: (tripId) => api.patch(`/trip/complete/${tripId}`),
  getActive: () => api.get('/trip/active'),
};

export const reportAPI = {
  submit: (reportData) => api.post('/report/submit', reportData),
  getNearby: (params) => api.get('/report/nearby', { params }),
  verify: (reportId) => api.patch(`/report/verify/${reportId}`),
  getByCategory: (category) => api.get(`/report/category/${category}`),
  getMyReports: () => api.get('/report/my-reports'),
};

export default api; 