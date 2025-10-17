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

// Mock Data
const mockTransactions = [
  {id:1,type:"receive",crypto:"BRT",amount:1500,status:"completed",date:"2025-10-07 14:30",from:"0x7a2...4f9"},
  {id:2,type:"send",crypto:"BRT",amount:250,status:"completed",date:"2025-10-06 09:15",to:"0x8b3...5e1"},
  {id:3,type:"swap",crypto:"BRT→USDT",amount:500,status:"pending",date:"2025-10-05 18:45",from:"Swap"},
];

const mockCoupons = [
  {id:1,code:"WELCOME100",discount:"100 BRT",type:"bonus",expires:"2025-12-31",used:false},
  {id:2,code:"SAVE20",discount:"20%",type:"discount",expires:"2025-11-30",used:false},
  {id:3,code:"VIP500",discount:"500 BRT",type:"bonus",expires:"2025-10-15",used:true},
];

const mockLottery = [
  {id:1,draw:"Weekly #42",date:"2025-10-14",jackpot:"50,000 BRT",winner:"0x7a2...4f9"},
  {id:2,draw:"Weekly #41",date:"2025-10-07",jackpot:"45,000 BRT",winner:"0x3c1...8a7"},
];

const mockReferrals = [
  {id:1,name:"Alice Johnson",email:"alice@example.com",joined:"2025-09-15",earnings:"250 BRT",status:"active"},
  {id:2,name:"Bob Smith",email:"bob@example.com",joined:"2025-09-20",earnings:"180 BRT",status:"active"},
];

const Dashboard = ({addNotification}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [ticketCount, setTicketCount] = useState(1);
  
  const totalBalance = typeof user?.balances?.BRT === 'number' ? user.balances.BRT : 0;
  const referralCode = user?.referralCode || "BRT-" + Math.random().toString(36).substr(2, 6).toUpperCase();
  
  // Listener для переключения вкладки из других компонентов (например, ClubAvalanche)
  useEffect(() => {
    const handleTabSwitch = (event) => {
      setActiveTab(event.detail);
    };
    
    window.addEventListener('switchToDashboardTab', handleTabSwitch);
    
    return () => {
      window.removeEventListener('switchToDashboardTab', handleTabSwitch);
    };
  }, []);
  
  // Проверка сообщения для BrunoChat при загрузке
  useEffect(() => {
    const shareMessage = localStorage.getItem('brunoChat_shareMessage');
    if (shareMessage && activeTab === 'messenger') {
      // Сообщение будет обработано в компоненте Messenger
    }
  }, [activeTab]);
  
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
    if (totalBalance < cost) {
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
          {/* Новый лого - замени src на путь к твоему новому лого */}
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
          <div className="balance-amount">{totalBalance.toLocaleString()} BRT</div>
          <div className="balance-subtitle">≈ ${(totalBalance * 0.1).toLocaleString()} USD</div>
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
                <div className="overview-card-value">{totalBalance.toLocaleString()}</div>
                <div className="overview-card-subtitle">BRT Tokens</div>
              </div>
              
              <div className="overview-card">
                <div className="overview-card-header">
                  <span className="overview-icon">📊</span>
                  <span className="overview-card-title">Total Transactions</span>
                </div>
                <div className="overview-card-value">{mockTransactions.length}</div>
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
              <div className="transactions-list">
                {mockTransactions.slice(0, 3).map(tx => (
                  <div key={tx.id} className="transaction-item">
                    <div className="tx-icon" style={{background: tx.type==="receive"?"#4CAF50":tx.type==="send"?"#FF5252":"#2196F3"}}>
                      {tx.type==="receive"?"↓":tx.type==="send"?"↑":"⇄"}
                    </div>
                    <div className="tx-details">
                      <div className="tx-main">
                        <span className="tx-type">{tx.type.charAt(0).toUpperCase()+tx.type.slice(1)}</span>
                        <span className="tx-crypto">{tx.crypto}</span>
                      </div>
                      <div className="tx-meta">
                        <span className="tx-date">{tx.date}</span>
                        <span className="tx-address">{tx.from || tx.to || tx.crypto}</span>
                      </div>
                    </div>
                    <div className="tx-amount-status">
                      <span className="tx-amount">{tx.type==="send"?"-":"+"}{tx.amount}</span>
                      <span className="tx-status" style={{color: tx.status==="completed"?"#4CAF50":"#FFA726"}}>{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
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
        {activeTab==="transactions" && (
          <div className="transactions-section">
            <h3>Transaction History</h3>
            <div className="transactions-list">
              {mockTransactions.map(tx => (
                <div key={tx.id} className="transaction-item">
                  <div className="tx-icon" style={{background: tx.type==="receive"?"#4CAF50":tx.type==="send"?"#FF5252":"#2196F3"}}>
                    {tx.type==="receive"?"↓":tx.type==="send"?"↑":"⇄"}
                  </div>
                  <div className="tx-details">
                    <div className="tx-main">
                      <span className="tx-type">{tx.type.charAt(0).toUpperCase()+tx.type.slice(1)}</span>
                      <span className="tx-crypto">{tx.crypto}</span>
                    </div>
                    <div className="tx-meta">
                      <span className="tx-date">{tx.date}</span>
                      <span className="tx-address">{tx.from || tx.to || "Internal"}</span>
                    </div>
                  </div>
                  <div className="tx-amount-status">
                    <span className="tx-amount">{tx.type==="send"?"-":"+"}{tx.amount}</span>
                    <span className="tx-status" style={{color: tx.status==="completed"?"#4CAF50":"#FFA726"}}>{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab==="club" && <ClubAvalanche />}
        {activeTab==="challenge" && <Challenge />}
        {activeTab==="messenger" && <Messenger />}
        {activeTab === 'starchallenge' && <StarsChallenge user={user} />}
          <div className="star-challenge-placeholder">
            <h2>⭐ BRT STAR CHALLENGE</h2>
            <p>Coming Soon...</p>
            <p style={{color: '#999', fontSize: '14px'}}>This exciting new feature is under development!</p>
          </div>
        )}
        {activeTab==="moderator" && <ModeratorDashboard />}
      </div>
      
      <SendModal isOpen={isSendModalOpen} onClose={()=>setIsSendModalOpen(false)} balances={{BRT:totalBalance}} addNotification={addNotification}/>
      <ReceiveModal isOpen={isReceiveModalOpen} onClose={()=>setIsReceiveModalOpen(false)} balances={{BRT:totalBalance}} addNotification={addNotification}/>
      <SwapModal isOpen={isSwapModalOpen} onClose={()=>setIsSwapModalOpen(false)} balances={{BRT:totalBalance}} addNotification={addNotification}/>
    </div>
  );
};

export default Dashboard;