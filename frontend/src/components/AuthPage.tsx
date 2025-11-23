import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Lock, User, ArrowRight } from 'lucide-react';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                const formData = new FormData();
                formData.append('username', username);
                formData.append('password', password);
                const response = await api.post('/auth/login', formData);
                localStorage.setItem('token', response.data.access_token);
                navigate('/');
            } else {
                await api.post('/auth/register', { username, password });
                setIsLogin(true);
                setError('Registration successful! Please login.');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p>{isLogin ? 'Enter your credentials to access your chats' : 'Sign up to start chatting'}</p>
                </div>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label><User size={18} /> Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Enter username"
                        />
                    </div>
                    <div className="form-group">
                        <label><Lock size={18} /> Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter password"
                        />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" className="auth-button">
                        {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={18} />
                    </button>
                </form>
                <div className="auth-footer">
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button onClick={() => setIsLogin(!isLogin)} className="link-button">
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
