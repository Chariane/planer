import React from 'react';
import { motion } from 'framer-motion';

interface KhcLogoProps {
    size?: number;
    className?: string;
}

const KhcLogo: React.FC<KhcLogoProps> = ({ size = 40, className = "" }) => {
    return (
        <motion.div
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className={`relative flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
        >
            {/* Outer Glow */}
            <div className="absolute inset-0 bg-secondary/20 blur-[8px] rounded-xl" />

            {/* Main Square */}
            <div className="relative w-full h-full bg-secondary rounded-xl shadow-lg flex items-center justify-center overflow-hidden border border-white/20">
                <span className="text-white font-black italic tracking-tighter" style={{ fontSize: size * 0.5 }}>KP</span>

                {/* Animated Accent */}
                <motion.div
                    className="absolute -bottom-1 -right-1 w-1/2 h-1/2 bg-white/20 blur-sm rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
            </div>
        </motion.div>
    );
};

export default KhcLogo;
