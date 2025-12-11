import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Register.module.css';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validare parole
    if (formData.password !== formData.confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      if (response.status === 201) {
        setMessage({ 
          text: 'Registration successful! Redirecting to login...', 
          type: 'success' 
        });
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Registration failed. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.register}>
      <div className={styles.div}>
        <div className={styles.logo} />
        <div className={styles.frame}>
          <form onSubmit={handleSubmit}>
            <div className={styles["text-wrapper-2"]}>Sign up</div>
            
            <div className={styles["overlap-group-wrapper"]}>
              <div className={styles.overlap}>
                <input
                  type="text"
                  name="username"
                  className={styles.input}
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className={styles["overlap-wrapper"]}>
              <div className={styles.overlap}>
                <input
                  type="email"
                  name="email"
                  className={styles.input}
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles["group-2"]}>
              <div className={styles.overlap}>
                <input
                  type="password"
                  name="password"
                  className={styles.input}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles["group-3"]}>
              <div className={styles.overlap}>
                <input
                  type="password"
                  name="confirmPassword"
                  className={styles.input}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {message.text && (
              <div className={`${styles.message} ${styles.show} ${
                message.type === 'success' ? styles.success : styles.error
              }`}>
                {message.text}
              </div>
            )}

            <div className={styles.group}>
              <div className={styles["overlap-group"]}>
                <button 
                  type="submit" 
                  className={styles["text-wrapper"]}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Sign up'}
                </button>
              </div>
            </div>

            <p className={styles.p}>
              Already have an account?
              <span 
                className={styles.link} 
                onClick={() => navigate('/login')}
              >
                Sign in
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}