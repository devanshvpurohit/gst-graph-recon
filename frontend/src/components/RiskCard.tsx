import React from 'react';

interface RiskCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
    default: {
        border: 'border-primary-500/20',
        iconBg: 'bg-primary-500/10',
        iconColor: 'text-primary-400',
        glow: 'hover:shadow-primary-500/10',
    },
    success: {
        border: 'border-emerald-500/20',
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-400',
        glow: 'hover:shadow-emerald-500/10',
    },
    warning: {
        border: 'border-amber-500/20',
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-400',
        glow: 'hover:shadow-amber-500/10',
    },
    danger: {
        border: 'border-red-500/20',
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-400',
        glow: 'hover:shadow-red-500/10',
    },
};

export default function RiskCard({ title, value, subtitle, icon, trend, variant = 'default' }: RiskCardProps) {
    const styles = variantStyles[variant];

    return (
        <div className={`glass-card p-6 ${styles.border} ${styles.glow} hover:shadow-lg transition-all duration-300 animate-fade-in`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${styles.iconBg}`}>
                    {icon || (
                        <svg className={`w-6 h-6 ${styles.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    )}
                </div>
                {trend && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                    </span>
                )}
            </div>
            <p className="text-sm text-slate-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white metric-value">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
        </div>
    );
}
