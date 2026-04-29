import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const CTASection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section className="py-24 md:py-32 bg-sidebar-bg relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[50%] h-full bg-hmx-gradient opacity-5 skew-x-12 translate-x-1/2"></div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto text-center"
        >
          <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-8">
            Ready to scale?
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
            TRANSFORM YOUR <br />
            <span className="text-transparent bg-clip-text bg-hmx-gradient">BUSINESS EXPERIENCE</span>
          </h2>

          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto font-medium">
            Join hundreds of businesses that have elevated their online presence and increased customer engagement with our cutting-edge FPV virtual tours.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link
              to="/signup"
              className="bg-hmx-gradient hover:scale-[1.02] active:scale-95 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all inline-flex items-center justify-center shadow-hmx-lg group"
            >
              Get Started Today
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-3 group-hover:translate-x-1 transition-transform"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/signup"
              className="bg-white/5 hover:bg-white/10 text-white px-10 py-5 rounded-2xl font-black text-lg transition-all inline-flex items-center justify-center border border-white/10"
            >
              View Case Studies
            </Link>
          </div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { label: 'Successful Projects', value: '200+' },
              { label: 'Industries Served', value: '15+' },
              { label: 'Conversion Increase', value: '30%+' }
            ].map((stat, i) => (
              <div key={i} className="group p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.07]">
                <div className="text-5xl font-black text-white mb-3 tracking-tighter group-hover:bg-hmx-gradient group-hover:bg-clip-text group-hover:text-transparent transition-all">
                  {stat.value}
                </div>
                <p className="text-sm font-black text-zinc-500 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;