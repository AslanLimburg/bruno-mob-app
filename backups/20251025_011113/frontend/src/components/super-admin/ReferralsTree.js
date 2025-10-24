import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ReferralsTree = () => {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReferrals();
    }, []);

    const fetchReferrals = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/super-admin/referrals`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setReferrals(response.data.data);
            }
        } catch (err) {
            console.error('Fetch referrals error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="referrals-tree">
            <div className="management-header">
                <h2>🔗 Referrals Tree</h2>
                <button onClick={fetchReferrals} className="refresh-btn">🔄 Refresh</button>
            </div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading referrals...</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="referrals-table">
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Email</th>
                                <th>Referrer ID</th>
                                <th>Level</th>
                                <th>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {referrals.map(ref => (
                                <tr key={ref.id}>
                                    <td>{ref.id}</td>
                                    <td className="user-email" style={{paddingLeft: `${(ref.level - 1) * 20}px`}}>
                                        {ref.level > 1 && '↳ '}
                                        {ref.email}
                                    </td>
                                    <td>{ref.referrer_id || '-'}</td>
                                    <td>
                                        <span className={`level-badge level-${ref.level}`}>
                                            Level {ref.level}
                                        </span>
                                    </td>
                                    <td>{new Date(ref.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ReferralsTree;