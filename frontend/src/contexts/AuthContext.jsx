import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../config';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(false);

    const API_BASE = getApiBaseUrl();

    // Logout
    const logout = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API_BASE}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
        }
    }, []);

    // Fetch user profile
    const fetchUserProfile = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;

            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                return userData;
            } else if (response.status === 401) {
                // Token invalid
                logout();
                return null;
            }
        } catch (error) {
            console.error('Profile fetch failed:', error);
            logout();
            return null;
        }
    }, [logout]);

    // Check if setup is needed
    const checkSetupStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/setup/needs-setup`);
            const data = await response.json();
            setNeedsSetup(data.needs_setup);
            return data.needs_setup;
        } catch (error) {
            console.error('Setup check failed:', error);
            return false;
        }
    }, []);

    // Create initial admin
    const createAdmin = async (adminData) => {
        try {
            const response = await fetch(`${API_BASE}/setup/create-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adminData)
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('token', result.access_token);
                setUser(result.user);
                setNeedsSetup(false);
                return result;
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Setup failed');
            }
        } catch (error) {
            console.error('Admin creation failed:', error);
            throw error;
        }
    };

    // Login
    const login = async (loginData) => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/login-json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: loginData.username,
                    password: loginData.password
                })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                setUser(data.user);
                return data;
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    // Check auth status on app start
    useEffect(() => {
        const initAuth = async () => {
            setLoading(true);
            
            // Check if setup is needed first
            const needsSetup = await checkSetupStatus();
            
            if (!needsSetup) {
                // Try to get user if token exists
                await fetchUserProfile();
            }
            
            setLoading(false);
        };

        initAuth();
    }, [checkSetupStatus, fetchUserProfile]);

    // Update user function
    const updateUser = useCallback((updatedUser) => {
        setUser(updatedUser);
    }, []);

    const value = {
        user,
        loading,
        needsSetup,
        login,
        logout,
        createAdmin,
        checkSetupStatus,
        updateUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isModerator: user?.role === 'admin'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
