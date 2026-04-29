import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light p-6 relative overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-2xl bg-white shadow-hmx-lg rounded-[40px] p-12 text-center relative z-10 border border-white/50 backdrop-blur-sm"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-hmx-gradient rounded-3xl mb-8 shadow-hmx-lg transform -rotate-3 transition-transform hover:rotate-0">
          <span className="text-4xl font-black text-white tracking-tighter">H</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 mb-4 tracking-tight leading-tight">
          WELCOME TO <span className="text-transparent bg-clip-text bg-hmx-gradient">HMX</span>
        </h1>
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-12">
          Select your journey and explore the future of mobility
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-hmx-gradient hover:bg-hmx-gradient-hover text-white font-black py-4 px-6 rounded-2xl transition-all shadow-hmx hover:scale-[1.02] active:scale-95 text-lg"
          >
            Login to Account
          </button>
          <button
            onClick={() => navigate('/standalone-bbd')}
            className="w-full bg-sidebar-bg text-white font-black py-4 px-6 rounded-2xl transition-all shadow-lg hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 text-lg"
          >
            Business SignUp
          </button>

          <div className="grid grid-cols-2 gap-4 sm:col-span-2">
            {[
              { label: 'Pilot Hub', path: '/pilot-signup', color: 'bg-zinc-50 hover:bg-zinc-100' },
              { label: 'Referral Team', path: '/referral-signup', color: 'bg-zinc-50 hover:bg-zinc-100' },
              { label: 'Creative Editor', path: '/editor-signup', color: 'bg-zinc-50 hover:bg-zinc-100' },
              { label: 'Guest Booking', path: '/guest-signup', color: 'bg-zinc-50 hover:bg-zinc-100' },
            ].map((btn) => (
              <button
                key={btn.path}
                onClick={() => navigate(btn.path)}
                className={`py-4 px-4 rounded-xl font-bold text-zinc-900 transition-all border border-zinc-100 hover:border-zinc-200 shadow-sm hover:shadow-md ${btn.color} text-sm`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomePage;
