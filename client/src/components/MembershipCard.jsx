import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { Star, Gift, Crown, Trophy, CheckCircle, Smartphone } from 'lucide-react';
import './MembershipCard.css';

export default function MembershipCard({ clientName, rank, stamps, rewardAvailable, qrToken, totalRequired = 10 }) {
    const [isFlipped, setIsFlipped] = useState(false);

    // Determines rank icon and color
    const getRankDetails = (rankName) => {
        switch (rankName?.toLowerCase()) {
            case 'oro': return { icon: <Crown size={24} />, color: '#FCD34D', bg: 'linear-gradient(135deg, #1A1A2E 0%, #374151 100%)' };
            case 'plata': return { icon: <Trophy size={24} />, color: '#E5E7EB', bg: 'linear-gradient(135deg, #1A1A2E 0%, #4B5563 100%)' };
            default: return { icon: <Star size={24} />, color: '#D97706', bg: 'linear-gradient(135deg, #151525 0%, #2A2A35 100%)' };
        }
    };

    const rankDetails = getRankDetails(rank);

    return (
        <div className="membership-container">
            <div className="membership-perspective">
                <motion.div
                    className="membership-card-inner"
                    initial={false}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {/* FRONT FACING CARD */}
                    <div className="membership-front" style={{ background: rankDetails.bg }}>
                        <div className="card-header">
                            <div className="card-brand">
                                <span className="brand-title">THE GANGSTA</span>
                                <span className="brand-subtitle">VIP ACCESS</span>
                            </div>
                            <div className="card-rank" style={{ color: rankDetails.color }}>
                                {rankDetails.icon}
                                <span>{rank}</span>
                            </div>
                        </div>

                        <div className="card-body">
                            <div className="card-chip"></div>
                            <h2 className="client-name">{clientName}</h2>
                        </div>

                        {rewardAvailable ? (
                            <div className="reward-banner">
                                <Gift size={18} /> Recompensa Disponible
                            </div>
                        ) : (
                            <div className="stamps-tracker">
                                <div className="stamps-header">
                                    <span>Progreso de Lealtad</span>
                                    <span>{stamps} / {totalRequired}</span>
                                </div>
                                <div className="stamps-bar-bg">
                                    <motion.div
                                        className="stamps-bar-fill"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(stamps / totalRequired) * 100}%` }}
                                        transition={{ duration: 1, delay: 0.2 }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flip-hint">
                            <Smartphone size={14} /> Toca para ver el código QR
                        </div>
                    </div>

                    {/* BACK FACING CARD (QR CODE) */}
                    <div className="membership-back">
                        <div className="qr-header">
                            <h3>Escanea tu visita</h3>
                            <p>Muestra este código al barbero al terminar tu servicio.</p>
                        </div>

                        <div className="qr-wrapper">
                            {qrToken ? (
                                <QRCode
                                    value={qrToken}
                                    size={160}
                                    bgColor="#ffffff"
                                    fgColor="#1a1a2e"
                                    level="H"
                                />
                            ) : (
                                <div className="qr-placeholder">Cargando...</div>
                            )}
                        </div>

                        <div className="flip-hint dark-hint">
                            Toca para volver
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
