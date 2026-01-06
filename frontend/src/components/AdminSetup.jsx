import { useState } from 'react';
import logo from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
import InfoModal from './InfoModal';

const AdminSetup = () => {
    const { createAdmin, loading } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [infoModal, setInfoModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    // Password validation helper
    const isPasswordValid = (password) => {
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        
        return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
    };

    // Get password requirement status
    const getPasswordRequirements = (password) => {
        return {
            minLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password)
        };
    };

    const validateForm = () => {
        const newErrors = {};

        // Username validation
        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters long';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (!isPasswordValid(formData.password)) {
            newErrors.password = 'Password does not meet all requirements';
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Password confirmation is required';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        
        if (!validateForm()) {
            return;
        }
        
        setIsSubmitting(true);

        try {
            await createAdmin({ 
                username: formData.username, 
                password: formData.password 
            });
            // User wird automatisch eingeloggt durch AuthContext
        } catch (err) {
            // Improved error message handling
            let errorMessage = 'Setup failed. Please try again.';
            
            if (err.message) {
                if (err.message.includes('already exists') || err.message.includes('duplicate')) {
                    errorMessage = 'Username already exists. Please choose a different username.';
                } else if (err.message.includes('password')) {
                    errorMessage = 'Password does not meet requirements.';
                } else if (err.message.includes('username')) {
                    errorMessage = 'Username must be at least 3 characters long.';
                } else if (err.message.includes('Setup already completed')) {
                    errorMessage = 'Admin account already exists. Please contact support.';
                } else {
                    errorMessage = 'Error creating admin account. Please try again.';
                }
            }
            
            setInfoModal({
                isOpen: true,
                title: 'Setup Error',
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        
        // Clear specific error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    if (loading) {
        return (
            <div className="setup-loading">
                <div className="loading-spinner"></div>
                <p>Checking setup status...</p>
            </div>
        );
    }

    return (
        <div className="setup-container">
            <div className="setup-card">
                <div className="setup-header">
                    <div className="flex items-center justify-center mb-8">
                        <img 
                            src={logo} 
                            alt="GameRequest Logo" 
                            className="w-24 h-24"
                        />
                    </div>
                    <h2>Initial Setup</h2>
                    <p>Create your admin account to get started</p>
                </div>

                <form onSubmit={handleSubmit} className="setup-form">
                    <div className="form-group">
                        <label htmlFor="username">Admin Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter admin username"
                            required
                            minLength={3}
                            className={errors.username ? 'error' : ''}
                        />
                        {errors.username && (
                            <div className="error-text">{errors.username}</div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter secure password"
                            required
                            className={errors.password ? 'error' : ''}
                        />
                        {errors.password && (
                            <div className="error-text">{errors.password}</div>
                        )}
                        
                        {/* Password Requirements */}
                        {formData.password && (
                            <div className="password-requirements">
                                <div className="text-sm text-gray-400 mb-2">Password Requirements:</div>
                                <div className="space-y-1">
                                    <div className={`text-sm flex items-center gap-2 ${getPasswordRequirements(formData.password).minLength ? 'text-green-400' : 'text-red-400'}`}>
                                        <span>{getPasswordRequirements(formData.password).minLength ? '✓' : '✗'}</span>
                                        At least 8 characters
                                    </div>
                                    <div className={`text-sm flex items-center gap-2 ${getPasswordRequirements(formData.password).hasUpperCase ? 'text-green-400' : 'text-red-400'}`}>
                                        <span>{getPasswordRequirements(formData.password).hasUpperCase ? '✓' : '✗'}</span>
                                        At least one uppercase letter
                                    </div>
                                    <div className={`text-sm flex items-center gap-2 ${getPasswordRequirements(formData.password).hasLowerCase ? 'text-green-400' : 'text-red-400'}`}>
                                        <span>{getPasswordRequirements(formData.password).hasLowerCase ? '✓' : '✗'}</span>
                                        At least one lowercase letter
                                    </div>
                                    <div className={`text-sm flex items-center gap-2 ${getPasswordRequirements(formData.password).hasNumber ? 'text-green-400' : 'text-red-400'}`}>
                                        <span>{getPasswordRequirements(formData.password).hasNumber ? '✓' : '✗'}</span>
                                        At least one number
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm your password"
                            required
                            className={errors.confirmPassword ? 'error' : ''}
                        />
                        {errors.confirmPassword && (
                            <div className="error-text">{errors.confirmPassword}</div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="setup-button"
                    >
                        {isSubmitting ? 'Creating Admin...' : 'Create Admin Account'}
                    </button>
                </form>

                <div className="setup-info">
                    <p><strong>Note:</strong> This will be the main administrator account with full access to the system.</p>
                </div>
            </div>

            {/* Info Modal */}
            <InfoModal
                isOpen={infoModal.isOpen}
                onClose={() => setInfoModal({ isOpen: false, title: '', message: '', type: 'info' })}
                title={infoModal.title}
                message={infoModal.message}
                type={infoModal.type}
            />
        </div>
    );
};

export default AdminSetup;
