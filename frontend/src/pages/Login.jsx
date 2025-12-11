import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './Login.module.css';

function parseJwt(t) {
  return JSON.parse(atob(t.split('.')[1]));
}

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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
    
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email: formData.email,
        password: formData.password
      });

      if (response.status === 200) {
        const token = response.data.access_token;
        localStorage.setItem('token', token);

        const payload = parseJwt(token);
        localStorage.setItem('uid', payload.sub);

        setMessage({ 
          text: 'Login successful! Redirecting...', 
          type: 'success' 
        });
        setTimeout(() => navigate('/home'), 1500);
        
      }
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Invalid credentials',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.login}>
      <div className={styles.div}>
        <div className={styles.logo} />
        <div className={styles.frame}>
          <form onSubmit={handleSubmit}>
            <div className={styles["text-wrapper-2"]}>Sign in</div>
            
            {/* Email Input */}
            <div className={styles["overlap-group-wrapper"]}>
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
            
            <div className={styles["overlap-wrapper"]}>
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
                {'Sign in'}
                </button>
              </div>
            </div>

            <p className={styles.p}>
              Don't have an account? 
              <span 
                className={styles.link} 
                onClick={() => navigate('/register')}
              >
                Register now
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}