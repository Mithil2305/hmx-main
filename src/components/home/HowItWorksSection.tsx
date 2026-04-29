import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { CalendarCheck, VideoIcon, Edit, Send } from 'lucide-react';

const HowItWorksSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const steps = [
    {
      icon: <CalendarCheck size={32} className="text-white" />,
      title: "1. Place Order / Schedule Consultation",
      description: "Book a consultation or place your order. Our team will discuss your needs and plan the perfect FPV tour for your business."
    },
    {
      icon: <VideoIcon size={32} className="text-white" />,
      title: "2. Site Visit & FPV Shoot",
      description: "Our expert drone pilots will visit your location and capture stunning FPV footage that showcases your business at its best."
    },
    {
      icon: <Edit size={32} className="text-white" />,
      title: "3. Editing & Post Production",
      description: "Our team carefully edits the footage, adding music, graphics, and branding elements to create a polished final product."
    },
    {
      icon: <Send size={32} className="text-white" />,
      title: "4. Final Delivery",
      description: "Receive your custom FPV tour ready to download, share, and embed on your website, social media, or marketing materials."
    }
  ];

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
    <section className="py-16 md:py-24 bg-gradient-to-b from-primary-50 to-white">
      <div className="container mx-auto px-4">
        <motion.div 
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-950 mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Our streamlined process makes getting your FPV virtual tour simple and hassle-free.
            From consultation to delivery, we handle everything.
          </p>
        </motion.div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-white rounded-lg shadow-lg p-6 relative"
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="bg-primary-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg">
                  {step.icon}
                </div>
              </div>
              
              <div className="pt-10 text-center">
                <h3 className="text-xl font-heading font-semibold text-primary-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-700">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Process Flow Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="hidden lg:block relative h-4 mt-8"
        >
          <div className="absolute top-0 left-[12.5%] right-[12.5%] h-1 bg-primary-100">
            <div className="absolute top-0 left-0 h-1 bg-primary-500 animate-pulse" style={{ width: '100%' }}></div>
          </div>
          
          <div className="absolute top-1/2 left-[12.5%] transform -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500"></div>
          <div className="absolute top-1/2 left-[37.5%] transform -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500"></div>
          <div className="absolute top-1/2 left-[62.5%] transform -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500"></div>
          <div className="absolute top-1/2 left-[87.5%] transform -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500"></div>
        </motion.div>
        
        <div className="text-center mt-12">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-md font-medium text-lg transition-colors inline-flex items-center"
          >
            Schedule Your FPV Tour
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="ml-2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;