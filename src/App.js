import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://98.81.95.254:3000/api';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
      fetchProducts();
    }
  }, []);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setLoading(false);
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity === 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
  };

  const [showCheckout, setShowCheckout] = useState(false);

  const checkout = () => {
    if (!user) {
      alert('Please login first');
      return;
    }
    setShowCart(false);
    setShowCheckout(true);
  };

  const processOrder = async (orderData) => {
    setLoading(true);
    try {
      const orderResponse = await axios.post(`${API_BASE}/orders`, {
        userId: user.id,
        items: cart,
        ...orderData
      });

      await axios.post(`${API_BASE}/payments/process`, {
        orderId: orderResponse.data.id,
        amount: orderResponse.data.total,
        paymentMethod: orderData.paymentMethod
      });

      setCart([]);
      setShowCheckout(false);
      alert('🎉 Order placed successfully!');
    } catch (error) {
      alert('❌ Order failed. Please try again.');
    }
    setLoading(false);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setCart([]);
  };
  
  const handleLoginSuccess = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app login-page">
        <div className="login-container">
          <div className="login-header">
            <h1 className="logo">🛒 ShopEasy</h1>
            <p>Welcome to your favorite shopping destination</p>
          </div>
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1 className="logo">🛒 ShopEasy</h1>
          <nav className="nav">
            <div className="user-info">
              <span>Welcome, {user.name}!</span>
              <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
            </div>
            <button className="cart-btn" onClick={() => setShowCart(true)}>
              🛒 Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <section className="hero">
            <h2>Discover Amazing Products</h2>
            <p>Shop the latest electronics, books, and more with fast delivery!</p>
          </section>

          <section className="products">
            <h3>Featured Products</h3>
            {loading ? (
              <div className="loading">Loading products...</div>
            ) : (
              <div className="product-grid">
                {products.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {showCart && (
        <CartModal 
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onCheckout={checkout}
          totalPrice={getTotalPrice()}
          loading={loading}
        />
      )}

      {showCheckout && (
        <CheckoutModal 
          cart={cart}
          totalPrice={getTotalPrice()}
          onClose={() => setShowCheckout(false)}
          onPlaceOrder={processOrder}
          loading={loading}
        />
      )}
    </div>
  );
}

function ProductCard({ product, onAddToCart }) {
  return (
    <div className="product-card">
      <div className="product-image">
        {product.category === 'Electronics' ? '💻' : '📚'}
      </div>
      <div className="product-info">
        <h4>{product.name}</h4>
        <p className="category">{product.category}</p>
        <p className="price">${product.price}</p>
        <p className="stock">{product.stock} in stock</p>
        <button 
          className="btn btn-primary add-to-cart"
          onClick={() => onAddToCart(product)}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function CartModal({ cart, onClose, onUpdateQuantity, onRemove, onCheckout, totalPrice, loading }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Shopping Cart</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {cart.length === 0 ? (
            <p className="empty-cart">Your cart is empty</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p>${item.price}</p>
                  </div>
                  <div className="quantity-controls">
                    <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                  <div className="item-total">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                  <button className="remove-btn" onClick={() => onRemove(item.id)}>🗑️</button>
                </div>
              ))}
              <div className="cart-total">
                <strong>Total: ${totalPrice}</strong>
              </div>
            </>
          )}
        </div>
        {cart.length > 0 && (
          <div className="modal-footer">
            <button 
              className="btn btn-primary checkout-btn"
              onClick={onCheckout}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({ cart, totalPrice, onClose, onPlaceOrder, loading }) {
  const [step, setStep] = useState(1);
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });
  const [paymentInfo, setPaymentInfo] = useState({
    paymentMethod: 'credit_card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    onPlaceOrder({ ...shippingInfo, ...paymentInfo });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal checkout-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Checkout</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="checkout-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Shipping</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Payment</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Review</div>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <form onSubmit={handleShippingSubmit} className="checkout-form">
              <h4>📦 Shipping Information</h4>
              <div className="form-row">
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={shippingInfo.fullName}
                  onChange={(e) => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                  required 
                />
              </div>
              <div className="form-row">
                <input 
                  type="text" 
                  placeholder="Street Address" 
                  value={shippingInfo.address}
                  onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                  required 
                />
              </div>
              <div className="form-row">
                <input 
                  type="text" 
                  placeholder="City" 
                  value={shippingInfo.city}
                  onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                  required 
                />
                <input 
                  type="text" 
                  placeholder="State" 
                  value={shippingInfo.state}
                  onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                  required 
                />
                <input 
                  type="text" 
                  placeholder="ZIP Code" 
                  value={shippingInfo.zipCode}
                  onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary">Continue to Payment</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handlePaymentSubmit} className="checkout-form">
              <h4>💳 Payment Information</h4>
              <div className="payment-methods">
                <label className="payment-method">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="credit_card"
                    checked={paymentInfo.paymentMethod === 'credit_card'}
                    onChange={(e) => setPaymentInfo({...paymentInfo, paymentMethod: e.target.value})}
                  />
                  💳 Credit Card
                </label>
                <label className="payment-method">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="paypal"
                    checked={paymentInfo.paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentInfo({...paymentInfo, paymentMethod: e.target.value})}
                  />
                  🅿️ PayPal
                </label>
              </div>
              
              {paymentInfo.paymentMethod === 'credit_card' && (
                <>
                  <div className="form-row">
                    <input 
                      type="text" 
                      placeholder="Cardholder Name" 
                      value={paymentInfo.cardName}
                      onChange={(e) => setPaymentInfo({...paymentInfo, cardName: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="form-row">
                    <input 
                      type="text" 
                      placeholder="Card Number (1234 5678 9012 3456)" 
                      value={paymentInfo.cardNumber}
                      onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="form-row">
                    <input 
                      type="text" 
                      placeholder="MM/YY" 
                      value={paymentInfo.expiryDate}
                      onChange={(e) => setPaymentInfo({...paymentInfo, expiryDate: e.target.value})}
                      required 
                    />
                    <input 
                      type="text" 
                      placeholder="CVV" 
                      value={paymentInfo.cvv}
                      onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                      required 
                    />
                  </div>
                </>
              )}
              
              <div className="order-summary">
                <h4>📋 Order Summary</h4>
                {cart.map(item => (
                  <div key={item.id} className="summary-item">
                    <span>{item.name} x{item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="summary-total">
                  <strong>Total: ${totalPrice}</strong>
                </div>
              </div>
              
              <div className="checkout-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : `Place Order - $${totalPrice}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isRegister) {
        await axios.post(`${API_BASE}/users/register`, { name, email, password });
        alert('Registration successful! Please login.');
        setIsRegister(false);
        setName('');
        setPassword('');
      } else {
        const response = await axios.post(`${API_BASE}/users/login`, { email, password });
        onLoginSuccess(response.data.user, response.data.token);
      }
    } catch (error) {
      setError(error.response?.data?.error || (isRegister ? 'Registration failed' : 'Login failed'));
    }
    setLoading(false);
  };

  return (
    <div className="login-form-container">
      <div className="login-form-card">
        <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="login-subtitle">
          {isRegister ? 'Join ShopEasy today' : 'Sign in to your account'}
        </p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
          )}
          <div className="form-group">
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        <div className="login-switch">
          <p>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button 
              type="button" 
              className="link-btn" 
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setName('');
                setPassword('');
              }}
            >
              {isRegister ? 'Sign In' : 'Create Account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;