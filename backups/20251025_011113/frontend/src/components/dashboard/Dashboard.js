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
import axios from 'axios';
import CryptoBalances from '../CryptoBalances';
import BRTCDexWidget from './BRTCDexWidget';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
  const [kycStatus, setKycStatus] = useState(null); // 🆕 KYC Status
  
  const referralCode = user?.referralCode || "BRT-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  
  // 🆕 Fetch KYC Status
  useEffect(() => {
    const fetchKYCStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_URL}/upload/verification/status`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setKycStatus(response.data);
      } catch (error) {
        console.error('Failed to fetch KYC status:', error);
      }
    };
    
    if (user?.id) {
      fetchKYCStatus();
    }
  }, [user?.id]);
  
  // 🆕 Get KYC Badge
  const getKYCBadge = () => {
    if (!kycStatus) {
      return {
        icon: '⚪',
        text: 'KYC',
        class: 'kyc-not-started',
        tooltip: 'Verification not started'
      };
    }

    const badges = {
      not_started: {
        icon: '⚪',
        text: 'KYC',
        class: 'kyc-not-started',
        tooltip: 'Verification not started'
      },
      pending: {
        icon: '🟡',
        text: 'KYC',
        class: 'kyc-pending',
        tooltip: 'Pending review'
      },
      verified: {
        icon: '🟢',
        text: 'KYC',
        class: 'kyc-verified',
        tooltip: 'Verified'
      },
      rejected: {
        icon: '🔴',
        text: 'KYC',
        class: 'kyc-rejected',
        tooltip: 'Rejected'
      }
    };

    return badges[kycStatus.status] || badges.not_started;
  };
  
  const kycBadge = getKYCBadge();
  
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
  
  // ✅ Функция перезагрузки транзакций с отладкой
const fetchTransactions = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL}/wallet/transactions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    
    console.log('📊 API Response:', data);
    console.log('📊 User ID:', user?.id);
    
    // ✅ ИСПРАВЛЕНО: data.success вместо data.status
    if (data.success && data.data) {
      console.log('📊 Raw transactions count:', data.data.length);
      
      const formattedTx = data.data.map(t => {
        // Определяем тип транзакции
        let type = 'send';
        if (t.to_user_id === user?.id) {
          type = 'receive';
        }
        
        console.log(`TX ${t.id}: from=${t.from_user_id}, to=${t.to_user_id}, user=${user?.id}, type=${type}`);
        
        return {
          id: t.id,
          type: type,
          crypto: t.crypto,
          amount: parseFloat(t.amount),
          status: t.status,
          date: new Date(t.created_at).toLocaleString(),
          from: t.from_email || 'System',
          to: t.to_email || 'System'
        };
      });
      
      console.log('✅ Formatted transactions:', formattedTx.length);
      console.log('✅ First 3 transactions:', formattedTx.slice(0, 3));
      setTransactions(formattedTx);
    } else {
      console.log('❌ Invalid response format:', data);
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
    await refreshUser();
    await fetchTransactions();
    console.log('✅ Data refreshed');
  };
  
  // ✅ Автообновление баланса каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('🔄 Auto-refreshing user data...');
      await refreshUser();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [refreshUser]);
  
  // ✅ ОБНОВЛЕННАЯ функция активации кода
 const handleRedeemCoupon = async () => {
    if (!couponCode) {
      addNotification("error", "Please enter an activation code");
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/activation/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: couponCode })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addNotification("success", data.message || `Code activated! ${data.data.brtAmount} BRT added`);
        setCouponCode("");
        
        // Обновляем данные
        await refreshUser();
        await fetchTransactions();
        
        // ✅ ПРИНУДИТЕЛЬНОЕ обновление баланса
        if (user?.balances?.BRT !== undefined) {
          const newBalance = user.balances.BRT + data.data.brtAmount;
          setLocalBalance(newBalance);
        }
      } else {
        addNotification("error", data.message || "Failed to activate code");
      }
    } catch (error) {
      console.error('Redeem error:', error);
      addNotification("error", "Failed to activate code");
    }
  };
  
  const handleBuyTickets = () => {
    const cost = ticketCount * 10;
    if (localBalance < cost) {
      addNotification("error", "Insufficient balance");
      return;
    }
    addNotification("success", `Purchased ${ticketCount} ticket(s) for ${cost} BRT!`);
  };
  
  // ✅ ОБНОВЛЕННАЯ функция покупки токенов через Stripe
  const handleBuyTokens = async (packageType, price, brt) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          packageType: packageType,
          email: user?.email
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        addNotification("error", "Failed to create checkout session");
      }
    } catch (error) {
      console.error('Checkout error:', error);
      addNotification("error", "Failed to initiate purchase");
    }
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
          {/* 🆕 KYC BADGE */}
          <button 
            onClick={() => navigate('/verification')} 
            className={`btn-kyc ${kycBadge.class}`}
            title={kycBadge.tooltip}
          >
            <span className="kyc-icon">{kycBadge.icon}</span>
            <span className="kyc-text">{kycBadge.text}</span>
            {kycStatus?.stats.pending > 0 && (
              <span className="kyc-counter">{kycStatus.stats.pending}</span>
            )}
          </button>
          
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
          <CryptoBalances />
          <div className="balance-amount">{localBalance.toLocaleString()} BRT</div>
          <div className="balance-subtitle">≈ ${(localBalance * 0.1).toLocaleString()} USD</div>
        </div>

        {/* BRTC DEX Widget */}
        <BRTCDexWidget />
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
        
        {/* Shop Tab - ОБНОВЛЕНО */}
        {activeTab==="shop" && (
          <div className="shop-section">
            <h3>💎 Buy BRTC Tokens</h3>
            <div className="shop-grid">
              <div className="shop-card">
                <span className="shop-icon">🌟</span>
                <h4>Basic Package</h4>
                <div className="shop-amount">5.5 BRTC</div>
                <div className="shop-price">$7</div>
                <button onClick={()=>handleBuyTokens('basic', 7, 5.5)} className="btn-buy">Buy Now</button>
              </div>
              
              <div className="shop-card">
                <span className="shop-icon">💰</span>
                <h4>Silver Package</h4>
                <div className="shop-amount">51 BRTC</div>
                <div className="shop-price">$61</div>
                <div className="shop-save">+1 BRTC Bonus!</div>
                <button onClick={()=>handleBuyTokens('silver', 61, 51)} className="btn-buy">Buy Now</button>
              </div>
              
              <div className="shop-card featured">
                <span className="shop-badge">BEST VALUE</span>
                <span className="shop-icon">⭐</span>
                <h4>Gold Package</h4>
                <div className="shop-amount">501 BRTC</div>
                <div className="shop-price">$600</div>
                <div className="shop-save">+1 BRTC Bonus!</div>
                <button onClick={()=>handleBuyTokens('gold', 600, 501)} className="btn-buy">Buy Now</button>
              </div>
              
              <div className="shop-card">
                <span className="shop-icon">💎</span>
                <h4>Platinum Package</h4>
                <div className="shop-amount">1,001 BRTC</div>
                <div className="shop-price">$1,200</div>
                <div className="shop-save">+1 BRTC Bonus!</div>
                <button onClick={()=>handleBuyTokens('platinum', 1200, 1001)} className="btn-buy">Buy Now</button>
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
        
        {/* Coupons Tab - ОБНОВЛЕНО */}
        {activeTab==="coupons" && (
          <div className="coupons-section">
            <h3>🎫 Redeem Activation Code</h3>
            
            <div className="coupon-redeem-section">
              <h4>Enter Activation Code</h4>
              <div className="coupon-input-group">
                <input 
                  type="text" 
                  value={couponCode} 
                  onChange={(e)=>setCouponCode(e.target.value.toUpperCase())} 
                  placeholder="BRT-XXXXXXXXXXXX"
                  className="coupon-input"
                  maxLength={20}
                />
                <button onClick={handleRedeemCoupon} className="btn-redeem">Activate</button>
              </div>
              <p className="coupon-info">Enter your activation code to receive BRT tokens instantly</p>
            </div>
            
            <h4>Your Activation Codes</h4>
            {mockCoupons.length === 0 ? (
              <div className="empty-state">
                <div style={{fontSize: '48px', marginBottom: '20px'}}>🎫</div>
                <div>No activation codes yet</div>
                <div className="empty-subtitle">Purchase BRT tokens to receive activation codes via email</div>
              </div>
            ) : (
              <div className="coupons-list">
                {mockCoupons.map(coupon => (
                  <div key={coupon.id} className={`coupon-card ${coupon.used?"used":""}`}>
                    <span className={`coupon-badge ${coupon.used?"used-badge":"bonus"}`}>
                      {coupon.used?"USED":"ACTIVE"}
                    </span>
                    <div className="coupon-code-text">{coupon.code}</div>
                    <div className="coupon-details">
                      <span className="coupon-value">{coupon.discount}</span>
                      <span className="coupon-expires">Expires: {coupon.expires}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
