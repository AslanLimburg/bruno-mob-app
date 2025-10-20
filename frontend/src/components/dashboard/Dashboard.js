import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";
import SendModal from "./SendModal";
import ReceiveModal from "./ReceiveModal";
import SwapModal from "./SwapModal";
import Lottery from "../lottery/Lottery";
import ClubAvalanche from "../club-avalanche/ClubAvalanche";
import Challenge from '../challenge/Challenge';
import ModeratorDashboard from '../admin/ModeratorDashboard';
import Messenger from '../messenger/Messenger';
import StarsChallenge from '../stars-challenge/StarsChallenge';
import { useNavigate } from 'react-router-dom';

const mockCoupons = [
  {id:1,code:"WELCOME100",discount:"100 BRT",type:"bonus",expires:"2025-12-31",used:false},
  {id:2,code:"SAVE20",discount:"20%",type:"discount",expires:"2025-11-30",used:false},
  {id:3,code:"VIP500",discount:"500 BRT",type:"bonus",expires:"2025-10-15",used:true},
];

const mockReferrals = [
  {id:1,name:"Alice Johnson",email:"alice@example.com",joined:"2025-09-15",earnings:"250 BRT",status:"active"},
  {id:2,name:"Bob Smith",email:"bob@example.com",joined:"2025-09-20",earnings:"180 BRT",status:"active"},
];

const Dashboard = ({addNotification}) => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [ticketCount, setTicketCount] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [localBalance, setLocalBalance] = useState(0);
  
  const referralCode = user?.referralCode || "BRT-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  
  // Синхронизировать localBalance с user.balances.BRT
  useEffect(() => {
    const newBalance = typeof user?.balances?.BRT === 'number' ? user.balances.BRT : 0;
    console.log('💰 Balance updated:', newBalance);
    setLocalBalance(newBalance);
  }, [user?.balances?.BRT]);
  
  // Listener для переключения вкладки
  useEffect(() => {
    const handleTabSwitch = (event) => {
      setActiveTab(event.detail);
    };
    
    window.addEventListener('switchToDashboardTab', handleTabSwitch);
    
    return () => {
      window.removeEventListener('switchToDashboardTab', handleTabSwitch);
    };
  }, []);
  
  // Проверка сообщения для BrunoChat
  useEffect(() => {
    const shareMessage = localStorage.getItem('brunoChat_shareMessage');
    if (shareMessage && activeTab === 'messenger') {
      // Сообщение будет обработано в компоненте Messenger
    }
  }, [activeTab]);
  
  // ✅ Функция перезагрузки транзакций
  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        const formattedTx = data.data.map(t => ({
          id: t.id,
          type: t.from_user_id === user?.id ? 'send' : 'receive',
          crypto: t.crypto,
          amount: parseFloat(t.amount),
          status: t.status,
          date: new Date(t.created_at).toLocaleString(),
          from: t.from_email || 'System',
          to: t.to_email || 'System'
        }));
        setTransactions(formattedTx);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  // Загрузить транзакции при монтировании
  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
    }
  }, [user?.id]);
  
  // ✅ Коллбек после успешной транзакции
  const handleTransactionComplete = async () => {
    console.log('🔄 Transaction completed, refreshing data...');
    await refreshUser();  // Обновить баланс
    await fetchTransactions();  // Обновить транзакции
    console.log('✅ Data refreshed');
  };
  
  // ✅ Автообновление баланса каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('🔄 Auto-refreshing user data...');
      await refreshUser();
    }, 10000); // 10 секунд
    
    return () => clearInterval(interval);
  }, [refreshUser]);
  
  const handleRedeemCoupon = () => {
    if (!couponCode) {
      addNotification("error", "Please enter a coupon code");
      return;
    }
    addNotification("success", `Coupon ${couponCode} redeemed successfully! +100 BRT`);
    setCouponCode("");
  };
  
  const handleBuyTickets = () => {
    const cost = ticketCount * 10;
    if (localBalance < cost) {
      addNotification("error", "Insufficient balance");
      return;
    }
    addNotification("success", `Purchased ${ticketCount} ticket(s) for ${cost} BRT!`);
  };
  
  const handleBuyTokens = (amount, price) => {
    addNotification("success", `Purchase initiated: ${amount} BRT for $${price}`);
  };
  
  const handleBuyMembership = (tier, price) => {
    addNotification("success", `${tier} membership purchase initiated for $${price}`);
  };
  
  return (
    <div className="dashboard-container">
      {/* Header with Logo and User Info */}
      <div className="dashboard-header">
        <div className="dashboard-logo">
          <img src="/images/logo-new.png" alt="Bruno Token Logo" className="logo-icon" 
               onError={(e) => e.target.src = "/images/logo.png"} />
          <div className="logo-text">
            <h1>Bruno Token</h1>
            <span className="logo-subtitle">Club Avalanche</span>
          </div>
        </div>
        
        {/* User Info */}
        <div className="user-info">
          <div className="user-name">{user?.name || 'User'}</div>
          <div className="user-email">{user?.email || 'user@example.com'}</div>
          <div className="user-id">ID: {user?.id || '000000'}</div>
        </div>
        
        <div className="header-actions">
          <button onClick={()=>setIsSendModalOpen(true)} className="btn-action">Send</button>
          <button onClick={()=>setIsReceiveModalOpen(true)} className="btn-action">Receive</button>
          <button onClick={()=>setIsSwapModalOpen(true)} className="btn-action">Swap</button>
          <button onClick={()=>{localStorage.clear();window.location.href="/login";}} className="btn-logout">Logout</button>
        </div>
      </div>
      
      <div className="dashboard-content">
        {/* Balance Card */}
        <div className="balance-card">
          <h2>Total Balance</h2>
          <div className="balance-amount">{localBalance.toLocaleString()} BRT</div>
          <div className="balance-subtitle">≈ ${(localBalance * 0.1).toLocaleString()} USD</div>
        </div>
        
        {/* Vector of Destiny Button */}
        <div className="vector-destiny-banner" onClick={() => navigate('/vector-destiny')}>
          <div className="vector-banner-content">
            <div className="vector-icon">✨</div>
            <div className="vector-text">
              <h3>Vector of Destiny</h3>
              <p>Discover your personalized astrological forecast</p>
            </div>
            <div className="vector-arrow">→</div>
          </div>
        </div>
        
        {/* Tabs - Row 1 */}
        <div className="tabs">
          <button className={activeTab==="overview"?"tab active":"tab"} onClick={()=>setActiveTab("overview")}>Overview</button>
          <button className={activeTab==="shop"?"tab active":"tab"} onClick={()=>setActiveTab("shop")}>Shop</button>
          <button className={activeTab==="coupons"?"tab active":"tab"} onClick={()=>setActiveTab("coupons")}>Coupons</button>
          <button className={activeTab==="lottery"?"tab active":"tab"} onClick={()=>setActiveTab("lottery")}>Lottery</button>
          <button className={activeTab==="transactions"?"tab active":"tab"} onClick={()=>setActiveTab("transactions")}>Transactions</button>
        </div>
        
        {/* Tabs - Row 2 */}
        <div className="tabs tabs-row-2">
          <button className={activeTab==="club"?"tab active":"tab"} onClick={()=>setActiveTab("club")}>Club Avalanche</button>
          <button className={activeTab==="challenge"?"tab active":"tab"} onClick={()=>setActiveTab("challenge")}>🎯 Challenge</button>
          <button className={activeTab==="messenger"?"tab active":"tab"} onClick={()=>setActiveTab("messenger")}>💬 BrunoChat</button>
          <button className={activeTab==="starchallenge"?"tab active":"tab"} onClick={()=>setActiveTab("starchallenge")}>⭐ BRT Star Challenge</button>
          {user?.role === 'moderator' && (
            <button className={activeTab==="moderator"?"tab active":"tab"} onClick={()=>setActiveTab("moderator")}>⚖️ Moderator</button>
          )}
        </div>
        
        {/* Overview Tab */}
        {activeTab==="overview" && (
          <div className="overview-section">
            <div className="overview-cards">
              <div className="overview-card">
                <div className="overview-card-header">
                  <span className="overview-icon">💰</span>
                  <span className="overview-card-title">Total Balance</span>
                </div>
                <div className="overview-card-value">{localBalance.toLocaleString()}</div>
                <div className="overview-card-subtitle">BRT Tokens</div>
              </div>
              
              <div className="overview-card">
                <div className="overview-card-header">
                  <span className="overview-icon">📊</span>
                  <span className="overview-card-title">Total Transactions</span>
                </div>
                <div className="overview-card-value">{transactions.length}</div>
                <div className="overview-card-subtitle">All time</div>
              </div>
              
              <div className="overview-card">
                <div className="overview-card-header">
                  <span className="overview-icon">👥</span>
                  <span className="overview-card-title">Referrals</span>
                </div>
                <div className="overview-card-value">{mockReferrals.length}</div>
                <div className="overview-card-subtitle">Active users</div>
              </div>
              
              <div className="overview-card">
                <div className="overview-card-header">
                  <span className="overview-icon">🎟️</span>
                  <span className="overview-card-title">Lottery Tickets</span>
                </div>
                <div className="overview-card-value">12</div>
                <div className="overview-card-subtitle">This week</div>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="transactions-section">
              <h3>Recent Activity</h3>
              {loadingTransactions ? (
                <div className="empty-state">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="empty-state">
                  <div style={{fontSize: '48px', marginBottom: '20px'}}>📋</div>
                  <div>No transactions yet</div>
                </div>
              ) : (
                <div className="transactions-list">
                  {transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="transaction-item">
                      <div className="tx-icon" style={{background: tx.type==="receive"?"#4CAF50":"#FF5252"}}>
                        {tx.type==="receive"?"↓":"↑"}
                      </div>
                      <div className="tx-details">
                        <div className="tx-main">
                          <span className="tx-type">{tx.type.charAt(0).toUpperCase()+tx.type.slice(1)}</span>
                          <span className="tx-crypto">{tx.crypto}</span>
                        </div>
                        <div className="tx-meta">
                          <span className="tx-date">{tx.date}</span>
                          <span className="tx-address">{tx.type==="send"?`To: ${tx.to}`:`From: ${tx.from}`}</span>
                        </div>
                      </div>
                      <div className="tx-amount-status">
                        <span className="tx-amount" style={{color: tx.type==="send"?"#FF5252":"#4CAF50"}}>
                          {tx.type==="send"?"-":"+"}{tx.amount.toFixed(2)}
                        </span>
                        <span className="tx-status" style={{background: tx.status==="completed"?"#4CAF50":"#FFA726"}}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Shop Tab */}
        {activeTab==="shop" && (
          <div className="shop-section">
            <h3>💎 Buy BRT Tokens</h3>
            <div className="shop-grid">
              <div className="shop-card">
                <span className="shop-icon">🌟</span>
                <h4>Starter Pack</h4>
                <div className="shop-amount">1,000 BRT</div>
                <div className="shop-price">$99</div>
                <button onClick={()=>handleBuyTokens(1000, 99)} className="btn-buy">Buy Now</button>
              </div>
              
              <div className="shop-card featured">
                <span className="shop-badge">BEST VALUE</span>
                <span className="shop-icon">⭐</span>
                <h4>Pro Pack</h4>
                <div className="shop-amount">5,000 BRT</div>
                <div className="shop-price">$450</div>
                <div className="shop-save">Save $50!</div>
                <button onClick={()=>handleBuyTokens(5000, 450)} className="btn-buy">Buy Now</button>
              </div>
              
              <div className="shop-card">
                <span className="shop-icon">💎</span>
                <h4>Elite Pack</h4>
                <div className="shop-amount">10,000 BRT</div>
                <div className="shop-price">$850</div>
                <div className="shop-save">Save $150!</div>
                <button onClick={()=>handleBuyTokens(10000, 850)} className="btn-buy">Buy Now</button>
              </div>
            </div>
            
            <h3 style={{marginTop: 40}}>🎖️ Membership Tiers</h3>
            <div className="membership-grid">
              <div className="membership-card bronze">
                <div className="membership-tier">Bronze</div>
                <div className="membership-price">$29/month</div>
                <ul className="membership-features">
                  <li>✓ 5% Cashback on trades</li>
                  <li>✓ Priority support</li>
                  <li>✓ Exclusive airdrops</li>
                </ul>
                <button onClick={()=>handleBuyMembership("Bronze", 29)} className="btn-membership">Subscribe</button>
              </div>
              
              <div className="membership-card silver">
                <div className="membership-tier">Silver</div>
                <div className="membership-price">$59/month</div>
                <ul className="membership-features">
                  <li>✓ 10% Cashback on trades</li>
                  <li>✓ VIP support 24/7</li>
                  <li>✓ Double airdrops</li>
                  <li>✓ Access to exclusive events</li>
                </ul>
                <button onClick={()=>handleBuyMembership("Silver", 59)} className="btn-membership">Subscribe</button>
              </div>
              
              <div className="membership-card gold featured">
                <span className="membership-badge">POPULAR</span>
                <div className="membership-tier">Gold</div>
                <div className="membership-price">$99/month</div>
                <ul className="membership-features">
                  <li>✓ 15% Cashback on trades</li>
                  <li>✓ Dedicated account manager</li>
                  <li>✓ Triple airdrops</li>
                  <li>✓ Early access to features</li>
                  <li>✓ Monthly bonus tokens</li>
                </ul>
                <button onClick={()=>handleBuyMembership("Gold", 99)} className="btn-membership gold-btn">Subscribe</button>
              </div>
              
              <div className="membership-card platinum">
                <div className="membership-tier">Platinum</div>
                <div className="membership-price">$199/month</div>
                <ul className="membership-features">
                  <li>✓ 20% Cashback on trades</li>
                  <li>✓ Personal VIP concierge</li>
                  <li>✓ 5x airdrops</li>
                  <li>✓ Private events access</li>
                  <li>✓ Unlimited withdrawals</li>
                  <li>✓ Custom trading strategies</li>
                </ul>
                <button onClick={()=>handleBuyMembership("Platinum", 199)} className="btn-membership platinum-btn">Subscribe</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Coupons Tab */}
        {activeTab==="coupons" && (
          <div className="coupons-section">
            <h3>🎫 Redeem Coupon</h3>
            
            <div className="coupon-redeem-section">
              <h4>Enter Coupon Code</h4>
              <div className="coupon-input-group">
                <input 
                  type="text" 
                  value={couponCode} 
                  onChange={(e)=>setCouponCode(e.target.value.toUpperCase())} 
                  placeholder="ENTER CODE"
                  className="coupon-input"
                  maxLength={20}
                />
                <button onClick={handleRedeemCoupon} className="btn-redeem">Redeem</button>
              </div>
              <p className="coupon-info">Enter your promotional code to receive bonuses or discounts</p>
            </div>
            
            <h4>Your Coupons</h4>
            <div className="coupons-list">
              {mockCoupons.map(coupon => (
                <div key={coupon.id} className={`coupon-card ${coupon.used?"used":""}`}>
                  <span className={`coupon-badge ${coupon.used?"used-badge":coupon.type}`}>
                    {coupon.used?"USED":coupon.type.toUpperCase()}
                  </span>
                  <div className="coupon-code-text">{coupon.code}</div>
                  <div className="coupon-details">
                    <span className="coupon-value">{coupon.discount}</span>
                    <span className="coupon-expires">Expires: {coupon.expires}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab==="lottery" && <Lottery />}
        
        {/* Transactions Tab */}
        {activeTab==="transactions" && (
          <div className="transactions-section">
            <h3>Transaction History</h3>
            {loadingTransactions ? (
              <div className="empty-state">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <div style={{fontSize: '48px', marginBottom: '20px'}}>📋</div>
                <div>No transactions yet</div>
                <div className="empty-subtitle">Your transaction history will appear here</div>
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.map(tx => (
                  <div key={tx.id} className="transaction-item">
                    <div className="tx-icon" style={{background: tx.type==="receive"?"#4CAF50":"#FF5252"}}>
                      {tx.type==="receive"?"↓":"↑"}
                    </div>
                    <div className="tx-details">
                      <div className="tx-main">
                        <span className="tx-type">{tx.type.charAt(0).toUpperCase()+tx.type.slice(1)}</span>
                        <span className="tx-crypto">{tx.crypto}</span>
                      </div>
                      <div className="tx-meta">
                        <span className="tx-date">{tx.date}</span>
                        <span className="tx-address">{tx.type==="send"?`To: ${tx.to}`:`From: ${tx.from}`}</span>
                      </div>
                    </div>
                    <div className="tx-amount-status">
                      <span className="tx-amount" style={{color: tx.type==="send"?"#FF5252":"#4CAF50"}}>
                        {tx.type==="send"?"-":"+"}{tx.amount.toFixed(2)} {tx.crypto}
                      </span>
                      <span className="tx-status" style={{background: tx.status==="completed"?"#4CAF50":"#FFA726"}}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab==="club" && <ClubAvalanche />}
        {activeTab==="challenge" && <Challenge />}
        {activeTab==="messenger" && <Messenger />}
        {activeTab === 'starchallenge' && <StarsChallenge user={user} />}
        {activeTab==="moderator" && <ModeratorDashboard />}
      </div>
      
      <SendModal 
        isOpen={isSendModalOpen} 
        onClose={()=>setIsSendModalOpen(false)} 
        balances={{BRT:localBalance}} 
        addNotification={addNotification}
        onTransactionComplete={handleTransactionComplete}
      />
      <ReceiveModal isOpen={isReceiveModalOpen} onClose={()=>setIsReceiveModalOpen(false)} balances={{BRT:localBalance}} addNotification={addNotification} user={user}/>  
      <SwapModal isOpen={isSwapModalOpen} onClose={()=>setIsSwapModalOpen(false)} balances={{BRT:localBalance}} addNotification={addNotification}/>
    </div>
  );
};

export default Dashboard;