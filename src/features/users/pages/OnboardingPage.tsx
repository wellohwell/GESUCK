import React, { useState } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { completeOnboarding } from '../services';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, MapPin, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export const OnboardingPage = () => {
    const { profile, firebaseUser, branchesList } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: profile?.name || '',
        phone: '',
        branchId: '',
        requestedRole: 'sales' as 'staff' | 'sales',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser || isLoading) return;
        
        setIsLoading(true);
        try {
            await completeOnboarding(firebaseUser.uid, formData);
            window.location.reload();
        } catch (err) {
            console.error('Onboarding submission failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter out inactive branches from onboarding selection
    const activeBranches = branchesList.filter(b => b.active !== false);

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans select-none transition-colors duration-300">
            {/* Ambient Background Polish */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] dark:bg-primary/[0.03] blur-[120px] rounded-full" />
                <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] contrast-125" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md bg-card/95 border border-border rounded-3xl shadow-premium backdrop-blur-xl p-8 md:p-10 relative z-10"
            >
                {/* Header branding & Greeting */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-[0_0_20px_rgba(198,255,46,0.1)]">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">
                        Complete Profil
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Full Name Input */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5 px-1">
                            <User className="w-3.5 h-3.5 text-primary/70" />
                            Nama Lengkap
                        </label>
                        <div className="relative">
                            <input 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                placeholder="Masukkan nama resmi Anda" 
                                className="w-full h-11 bg-background/50 focus:bg-background/80 border border-border focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl px-4 outline-none text-xs font-sans font-semibold tracking-wide transition-all duration-300 focus:ring-1 focus:ring-primary/20" 
                                required 
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Phone Number Input */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5 px-1">
                            <Phone className="w-3.5 h-3.5 text-primary/70" />
                            Nomor Whatsapp
                        </label>
                        <div className="relative">
                            <input 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                                placeholder="Contoh: 08123456789" 
                                className="w-full h-11 bg-background/50 focus:bg-background/80 border border-border focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl px-4 outline-none text-xs font-mono font-medium tracking-wide transition-all duration-300 focus:ring-1 focus:ring-primary/20" 
                                required 
                                disabled={isLoading}
                                type="tel"
                            />
                        </div>
                    </div>

                    {/* Branch Selection Dropdown */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5 px-1">
                            <MapPin className="w-3.5 h-3.5 text-primary/70" />
                            Kantor
                        </label>
                        <div className="relative">
                            <select 
                                value={formData.branchId} 
                                onChange={e => setFormData({...formData, branchId: e.target.value})} 
                                className="w-full h-11 bg-background/50 focus:bg-background/80 border border-border focus:border-primary/50 text-foreground placeholder:text-muted-foreground rounded-xl px-4 outline-none text-xs font-sans font-bold tracking-wide transition-all duration-300 focus:ring-1 focus:ring-primary/20 cursor-pointer appearance-none" 
                                required
                                disabled={isLoading}
                            >
                                <option value="" className="bg-card text-muted-foreground">Pilih Kantor</option>
                                {activeBranches.map(b => (
                                    <option key={b.branchId} value={b.branchId} className="bg-card text-foreground font-semibold">
                                        {b.branchName}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Role Selection Option Cards */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5 px-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary/70" />
                            Hak Akses
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => setFormData({...formData, requestedRole: 'sales'})}
                                className={cn(
                                    "h-11 rounded-xl border flex flex-col justify-center items-center transition-all text-[10px] font-black uppercase tracking-wider",
                                    formData.requestedRole === 'sales'
                                        ? "bg-primary text-primary-foreground border-transparent shadow-[0_3px_10px_rgba(198,255,46,0.12)]"
                                        : "bg-background/40 hover:bg-background/80 border-border text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="text-black">Sales</span>
                                <span className="text-black text-[7.5px] opacity-80 font-medium normal-case tracking-normal">Kunjungan &amp; Order</span>
                            </button>
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={() => setFormData({...formData, requestedRole: 'staff'})}
                                className={cn(
                                    "h-11 rounded-xl border flex flex-col justify-center items-center transition-all text-[10px] font-black uppercase tracking-wider",
                                    formData.requestedRole === 'staff'
                                        ? "bg-primary text-primary-foreground border-transparent shadow-[0_3px_10px_rgba(198,255,46,0.12)]"
                                        : "bg-background/40 hover:bg-background/80 border-border text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="text-black">Admin</span>
                                <span className="text-black text-[7.5px] opacity-80 font-medium normal-case tracking-normal">Verifikasi &amp; Operator</span>
                            </button>
                        </div>
                    </div>

                    {/* Submit Registration Capsule Button */}
                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/95 font-black text-xs uppercase tracking-widest shadow-md hover:shadow-primary/10 transition-all duration-300 rounded-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2 select-none"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
                                    <span>Memproses...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-black">Simpan</span>
                                    <ArrowRight className="text-black w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
