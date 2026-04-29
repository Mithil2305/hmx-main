import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users, DollarSign, Award, CheckCircle } from 'lucide-react';

const PilotsReferralsPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = React.useState<'pilots' | 'referrals'>('pilots');
  
  const [pilotsRef, pilotsInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  const [referralsRef, referralsInView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
    
    // Check for hash in URL to set active tab
    if (location.hash === '#referrals') {
      setActiveTab('referrals');
      
      // Delay scroll to element to ensure render
      setTimeout(() => {
        document.getElementById('referrals')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (location.hash === '#pilots') {
      setActiveTab('pilots');
      
      // Delay scroll to element to ensure render
      setTimeout(() => {
        document.getElementById('pilots')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    
    // Update page title
    document.title = 'Pilots & Referrals - HMX FPV Tours';
  }, [location]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="pt-20">
      {/* Page Header */}
      <div className="bg-primary-950 text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6">
              Join the HMX Team
            </h1>
            <p className="text-xl text-gray-200 mb-10">
              Whether you're a skilled FPV pilot or want to refer businesses to our services,
              there's an opportunity for you to be part of our growing network.
            </p>
            
            {/* Tab Navigation */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setActiveTab('pilots');
                  document.getElementById('pilots')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  activeTab === 'pilots'
                    ? 'bg-primary-500 text-white'
                    : 'bg-primary-800 text-gray-200 hover:bg-primary-700'
                }`}
              >
                For Pilots
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('referrals');
                  document.getElementById('referrals')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-6 py-3 rounded-md font-medium transition-colors ${
                  activeTab === 'referrals'
                    ? 'bg-primary-500 text-white'
                    : 'bg-primary-800 text-gray-200 hover:bg-primary-700'
                }`}
              >
                For Referrals
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* For Pilots Section */}
      <section id="pilots" ref={pilotsRef} className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block p-3 bg-primary-50 rounded-full mb-4">
                <span className="text-xl font-heading font-bold text-primary-600">HMX</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-950 mb-4">
                For FPV Pilots
              </h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Join our network of professional FPV pilots and turn your skills into a rewarding career.
              </p>
            </div>
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={pilotsInView ? "show" : "hidden"}
              className="mb-12"
            >
              <motion.h3 
                variants={itemVariants}
                className="text-2xl font-heading font-semibold text-primary-900 mb-6"
              >
                Pilot Workflow
              </motion.h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  {
                    title: "Registration",
                    description: "Complete our online application with your details and experience.",
                    icon: <Users size={32} className="text-primary-600" />
                  },
                  {
                    title: "Verification",
                    description: "Submit your credentials, licenses, and sample work for review.",
                    icon: <CheckCircle size={32} className="text-primary-600" />
                  },
                  {
                    title: "Training",
                    description: "Complete our standardized training program to ensure quality.",
                    icon: <Award size={32} className="text-primary-600" />
                  },
                  {
                    title: "Assignments",
                    description: "Receive shoot assignments in your area with competitive compensation.",
                    icon: <DollarSign size={32} className="text-primary-600" />
                  }
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="bg-white border border-gray-200 rounded-lg p-6"
                  >
                    <div className="bg-primary-50 p-3 rounded-full inline-block mb-4">
                      {step.icon}
                    </div>
                    <h4 className="text-xl font-semibold text-primary-900 mb-2">{step.title}</h4>
                    <p className="text-gray-700">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={pilotsInView ? "show" : "hidden"}
              className="mb-12"
            >
              <motion.h3 
                variants={itemVariants}
                className="text-2xl font-heading font-semibold text-primary-900 mb-6"
              >
                Prerequisites
              </motion.h3>
              
              <motion.div
                variants={itemVariants}
                className="bg-primary-50 rounded-lg p-6 mb-8"
              >
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="text-primary-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-800">Minimum 1 year of FPV drone piloting experience</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-primary-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-800">Required equipment: FPV drone setup (specs provided upon application)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-primary-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-800">FAA Part 107 license or equivalent in your region</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-primary-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-800">Portfolio of previous FPV work</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-primary-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-800">Reliable transportation and availability for scheduled shoots</span>
                  </li>
                </ul>
              </motion.div>
            </motion.div>
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={pilotsInView ? "show" : "hidden"}
            >
              <motion.h3 
                variants={itemVariants}
                className="text-2xl font-heading font-semibold text-primary-900 mb-6"
              >
                Cities Currently Accepting Pilots
              </motion.h3>
              
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
              >
                {["San Francisco", "Los Angeles", "New York", "Chicago", "Miami", "Seattle", "Austin", "Denver"].map((city, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg text-center">
                    <span className="text-primary-800 font-medium">{city}</span>
                  </div>
                ))}
              </motion.div>
              
              <motion.div
                variants={itemVariants}
                className="text-center"
              >
                <Link
                  to="/pilot-signup"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-md font-medium text-lg transition-colors inline-flex items-center"
                >
                  Become a Pilot
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
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* For Referrals Section */}
      <section id="referrals" ref={referralsRef} className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block p-3 bg-primary-50 rounded-full mb-4">
                <DollarSign size={32} className="text-primary-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-950 mb-4">
                For Referral Partners
              </h2>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Earn generous commissions by referring businesses to our FPV virtual tour services.
              </p>
            </div>
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={referralsInView ? "show" : "hidden"}
              className="mb-12"
            >
              <motion.h3 
                variants={itemVariants}
                className="text-2xl font-heading font-semibold text-primary-900 mb-6"
              >
                How Referrals Work
              </motion.h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Sign Up",
                    description: "Join our referral program by completing the online application.",
                    icon: <Users size={32} className="text-primary-600" />
                  },
                  {
                    title: "Refer Businesses",
                    description: "Connect us with businesses that could benefit from our services.",
                    icon: <Award size={32} className="text-primary-600" />
                  },
                  {
                    title: "Earn Commissions",
                    description: "Receive up to 15% commission on completed projects you refer.",
                    icon: <DollarSign size={32} className="text-primary-600" />
                  }
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="bg-white border border-gray-200 rounded-lg p-6"
                  >
                    <div className="bg-primary-50 p-3 rounded-full inline-block mb-4">
                      {step.icon}
                    </div>
                    <h4 className="text-xl font-semibold text-primary-900 mb-2">{step.title}</h4>
                    <p className="text-gray-700">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={referralsInView ? "show" : "hidden"}
              className="mb-12"
            >
              <motion.h3 
                variants={itemVariants}
                className="text-2xl font-heading font-semibold text-primary-900 mb-6"
              >
                Commission & Incentives
              </motion.h3>
              
              <motion.div
                variants={itemVariants}
                className="bg-primary-50 rounded-lg p-6 mb-8"
              >
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="text-primary-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-800">10-15% commission on all completed projects</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-primary-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-800">Bonus incentives for high-volume referrers</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-primary-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-800">Monthly payments via direct deposit or PayPal</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="text-primary-600 mr-3 mt-1 flex-shrink-0" size={20} />
                    <span className="text-gray-800">Transparent tracking dashboard for all your referrals</span>
                  </li>
                </ul>
              </motion.div>
            </motion.div>
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={referralsInView ? "show" : "hidden"}
            >
              <motion.h3 
                variants={itemVariants}
                className="text-2xl font-heading font-semibold text-primary-900 mb-6"
              >
                Who Can Be a Referral Partner?
              </motion.h3>
              
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"
              >
                {[
                  "Marketing Agencies",
                  "Real Estate Agents",
                  "Event Planners",
                  "Business Consultants",
                  "Web Designers",
                  "Photographers",
                  "Social Media Managers",
                  "Industry Professionals"
                ].map((partner, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="text-primary-600 mr-3 flex-shrink-0" size={20} />
                    <span className="text-gray-800">{partner}</span>
                  </div>
                ))}
              </motion.div>
              
              <motion.div
                variants={itemVariants}
                className="text-center"
              >
                <Link
                  to="/referral-signup"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-md font-medium text-lg transition-colors inline-flex items-center"
                >
                  Become a Referral Partner
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
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              Join the HMX Network Today
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Whether you're a skilled pilot or have a network of business connections,
              there's an opportunity for you to grow with us.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link
                to="/pilot-signup"
                className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-md font-medium text-lg transition-colors"
              >
                Apply as a Pilot
              </Link>
              <Link
                to="/referral-signup"
                className="border border-white hover:border-primary-300 hover:bg-white/10 text-white px-8 py-4 rounded-md font-medium text-lg transition-colors"
              >
                Register as a Referrer
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PilotsReferralsPage;