import { useState } from 'react';
import logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
    const { login, loading } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await login(formData);
            // Navigation occurs automatically through new routing in App.jsx
        } catch (err) {
            // Improved error message handling
            let errorMessage = 'Wrong username or password.';
            
            if (err.message) {
                if (err.message.includes('401') || err.message.includes('Unauthorized') || 
                    err.message.includes('credentials') || err.message.includes('LOGIN_BAD_CREDENTIALS')) {
                    errorMessage = 'Wrong username or password.';
                } else if (err.message.includes('400') || err.message.includes('Bad Request')) {
                    errorMessage = 'Please enter both username and password.';
                } else if (err.message.includes('500') || err.message.includes('Server Error')) {
                    errorMessage = 'Server error. Please try again later.';
                } else if (err.message.includes('network') || err.message.includes('fetch')) {
                    errorMessage = 'Connection error. Please check your internet connection.';
                } else {
                    errorMessage = 'Wrong username or password.';
                }
            }
            
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (loading) {
        return (
            <div className="login-loading">
                <div className="loading-spinner"></div>
                <p>Logging in...</p>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="flex items-center justify-center mb-6">
                        <img 
                            src={logo} 
                            alt="GameRequest Logo" 
                            className="w-16 h-16"
                        />
                    </div>
                    <h2>Sign In</h2>
                    <p>Please enter your credentials to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter your username"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="login-button"
                    >
                        {isSubmitting ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <p className="help-text">
                        Need help? Contact your administrator.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
