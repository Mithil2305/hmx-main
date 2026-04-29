import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Zap, TrendingUp, Award } from 'lucide-react';

const WhatIsFpvSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div 
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        >
          {/* Left Column: Video Explanation */}
          <motion.div variants={itemVariants} className="relative rounded-xl overflow-hidden shadow-xl">
            <div className="aspect-w-16 aspect-h-9">
              <iframe
                className="absolute w-full h-full"
                src="https://www.youtube.com/embed/NjllxnZTp80"
                title="FPV Drone Tour Example"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </motion.div>
          
          {/* Right Column: Written Explanation */}
          <div className="space-y-6">
            <motion.h2 
              variants={itemVariants} 
              className="text-3xl md:text-4xl font-heading font-bold text-primary-950"
            >
              What Are FPV Walkthroughs?
            </motion.h2>
            
            <motion.p variants={itemVariants} className="text-lg text-gray-700">
              FPV (First Person View) tours are immersive video experiences that put your customers
              in the pilot's seat, allowing them to explore your business in a fluid, dynamic way that 
              traditional photography or video simply can't match.
            </motion.p>
            
            <motion.p variants={itemVariants} className="text-lg text-gray-700">
              Using specialized drones piloted by experts, we capture smooth, cinematic footage that
              flows seamlessly from outside your location, through doorways, around corners, and into
              every corner of your space, creating a memorable journey that makes a powerful impression.
            </motion.p>
            
            <motion.div variants={itemVariants} className="pt-4">
              <h3 className="text-xl font-heading font-semibold text-primary-900 mb-4">
                Key Benefits Across Industries
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Zap className="text-primary-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Increase engagement by up to 80% over static photos</p>
                </div>
                
                <div className="flex items-start">
                  <TrendingUp className="text-primary-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Boost website time-on-page by 3x with immersive content</p>
                </div>
                
                <div className="flex items-start">
                  <span className="text-primary-500 mr-3 mt-1 flex-shrink-0 text-lg font-heading font-bold">HMX</span>
                  <p className="text-gray-700">Create unforgettable brand experiences for customers</p>
                </div>
                
                <div className="flex items-start">
                  <Award className="text-primary-500 mr-3 mt-1 flex-shrink-0" size={20} />
                  <p className="text-gray-700">Stand out from competitors with cutting-edge visuals</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="pt-2">
              <Link 
                to="/faq" 
                className="text-primary-600 hover:text-primary-700 font-medium flex items-center"
              >
                Learn more about FPV tours in our FAQ 
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="ml-1"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatIsFpvSection;