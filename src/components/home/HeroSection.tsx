import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HeroSection: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading the video
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Video Background */}
      {loading ? (
        <div className="absolute inset-0 bg-sidebar-bg animate-pulse" />
      ) : (
        <div className="absolute inset-0 bg-sidebar-bg">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute w-full h-full object-cover"
          >
            <source
              src="https://player.vimeo.com/external/481638839.hd.mp4?s=cee01e4160e90af10ccff28db4cf2b73e7bd6d90&profile_id=175&oauth2_token_id=57447761"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Hero Content */}
      <div className="container mx-auto px-4 h-full flex items-center relative z-20">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-4 py-1.5 bg-hmx-gradient rounded-full text-white text-[10px] font-black uppercase tracking-widest mb-6 shadow-hmx">
              Next-Gen FPV Solutions
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] mb-8 tracking-tighter">
              PILOTING THE <br />
              <span className="text-transparent bg-clip-text bg-hmx-gradient">FUTURE</span>
            </h1>
          </motion.div>

          <motion.p
            className="text-xl text-zinc-300 mb-12 font-medium max-w-2xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            HMX is a creative drone innovation company specializing in immersive FPV drone walkthroughs that capture the "real vibe" of locations. We merge storytelling with drone tech for restaurants, resorts, and beyond.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Link
              to="/signup"
              className="bg-hmx-gradient hover:scale-[1.02] active:scale-95 text-white px-10 py-4 rounded-2xl font-black text-lg transition-all flex-shrink-0 text-center shadow-hmx-lg"
            >
              Unlock Your Brand
            </Link>

            <Link
              to="/login"
              className="bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/20 text-white px-10 py-4 rounded-2xl font-black text-lg transition-all flex-shrink-0 text-center shadow-lg hover:scale-[1.02] active:scale-95"
            >
              Login
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ delay: 1.5, duration: 1.5, repeat: Infinity }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </motion.div>
    </div>
  );
};

export default HeroSection;