import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Log API URL in development (helps with debugging)
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', API_BASE_URL);
}

const AppContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
  currentBranch: null,
  branches: [],
  settings: null
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
        loading: false
      };
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        currentBranch: null,
        branches: []
      };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_BRANCHES':
      return { ...state, branches: action.payload };
    case 'SET_CURRENT_BRANCH':
      return { ...state, currentBranch: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Set up axios interceptors
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (state.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          dispatch({ type: 'LOGOUT' });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [state.token]);

  // Fetch user data on app load
  useEffect(() => {
    if (state.token) {
      fetchUserData();
    }
  }, [state.token]);

  const fetchUserData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      dispatch({ type: 'SET_USER', payload: response.data.user });
      
      const userData = response.data.user;

      if (userData.role === 'admin') {
        if (userData.branch) {
          dispatch({ type: 'SET_CURRENT_BRANCH', payload: userData.branch });
          dispatch({ type: 'SET_BRANCHES', payload: [userData.branch] });
        } else {
          await fetchBranches();
        }
      } else {
        dispatch({ type: 'SET_CURRENT_BRANCH', payload: userData.branch });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      dispatch({ type: 'LOGOUT' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/branches`);
      dispatch({ type: 'SET_BRANCHES', payload: response.data.branches });
      
      if (!state.currentBranch && response.data.branches.length > 0) {
        dispatch({ type: 'SET_CURRENT_BRANCH', payload: response.data.branches[0] });
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const login = async (email, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Log the login attempt for debugging
      console.log('🔐 Attempting login to:', `${API_BASE_URL}/auth/login`);
      
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.data.user,
          token: response.data.token
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      let message = 'Login failed';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        message = 'Cannot connect to server. Please check if the backend is running and VITE_API_BASE_URL is set correctly.';
      } else if (error.response?.status === 401) {
        message = 'Invalid email or password';
      } else if (error.response?.status === 404) {
        message = 'API endpoint not found. Please check your backend URL.';
      }
      
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      dispatch({ type: 'SET_LOADING', payload: false });
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const setCurrentBranch = (branch) => {
    dispatch({ type: 'SET_CURRENT_BRANCH', payload: branch });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const value = {
    ...state,
    login,
    logout,
    register,
    setCurrentBranch,
    clearError,
    setLoading,
    fetchUserData,
    fetchBranches
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};