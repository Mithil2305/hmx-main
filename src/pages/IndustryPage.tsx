import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { industries, Industry } from '../data/industries';
import { ArrowRight, CheckCircle } from 'lucide-react';

const IndustryPage: React.FC = () => {
  const { industry } = useParams<{ industry: string }>();
  const [currentIndustry, setCurrentIndustry] = React.useState<Industry | null>(null);
  
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  useEffect(() => {
    // Find the current industry from our data
    const found = industries.find(ind => ind.slug === industry);
    setCurrentIndustry(found || null);
    
    // Scroll to top on page load
    window.scrollTo(0, 0);
    
    // Update page title
    if (found) {
      document.title = `${found.name} FPV Tours - HMX`;
    } else {
      document.title = 'Industry FPV Tours - HMX';
    }
  }, [industry]);

  if (!currentIndustry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Industry Not Found</h1>
          <p className="mb-6">The industry you're looking for doesn't exist or has been moved.</p>
          <Link 
            to="/"
            className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-md transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="relative pt-24 pb-16 md:pb-24">
        <div className="absolute inset-0 bg-primary-950 opacity-70 z-0"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center z-[-1]"
          style={{ backgroundImage: `url(${currentIndustry.imageUrl})` }}
        ></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl text-white">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6">
              {currentIndustry.name} FPV Virtual Tours
            </h1>
            <p className="text-xl text-gray-200 mb-8">
              {currentIndustry.description}
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Link 
                to="/signup" 
                className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-md font-medium text-lg transition-colors inline-flex items-center justify-center"
              >
                Book Your {currentIndustry.name} Tour
                <ArrowRight size={20} className="ml-2" />
              </Link>
              <a 
                href="#examples" 
                className="border border-white hover:border-primary-300 text-white px-8 py-3 rounded-md font-medium text-lg transition-colors inline-flex items-center justify-center"
              >
                View Examples
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <section ref={ref} className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-950 mb-4">
              Benefits for {currentIndustry.name}
            </h2>
            <p className="text-lg text-gray-700">
              Discover how FPV virtual tours can transform your {currentIndustry.name.toLowerCase()} business
              and create unforgettable experiences for your customers.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {currentIndustry.benefits.map((benefit, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="bg-primary-50 rounded-lg p-6 flex"
              >
                <CheckCircle className="text-primary-500 mr-4 flex-shrink-0 mt-1" size={24} />
                <p className="text-gray-800 text-lg">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Examples Section */}
      <section id="examples" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-950 mb-4">
              {currentIndustry.name} FPV Examples
            </h2>
            <p className="text-lg text-gray-700">
              See how businesses like yours have transformed their customer experience with our FPV tours.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Example 1 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  src="https://www.youtube.com/embed/NjllxnZTp80"
                  title="FPV Drone Tour Example"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Client Success Story</h3>
                <p className="text-gray-700">
                  See how this {currentIndustry.name.toLowerCase()} business increased engagement by 40% with our custom FPV virtual tour.
                </p>
              </div>
            </div>
            
            {/* Example 2 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  src="https://www.youtube.com/embed/bcENL_Vdoqk"
                  title="FPV Drone Tour Example"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Before & After Comparison</h3>
                <p className="text-gray-700">
                  Witness the dramatic difference between traditional video and our immersive FPV approach.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              Ready to Transform Your {currentIndustry.name} Business?
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Join the growing number of {currentIndustry.name.toLowerCase()} businesses that have elevated their online presence with our cutting-edge FPV virtual tours.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link
                to="/signup"
                className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-md font-medium text-lg transition-colors"
              >
                Schedule Your FPV Tour
              </Link>
              <Link
                to="/pilots-referrals"
                className="border border-white hover:border-primary-300 hover:bg-white/10 text-white px-8 py-4 rounded-md font-medium text-lg transition-colors"
              >
                Become a Referral Partner
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Related Industries */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-heading font-bold text-primary-950 mb-8 text-center">
            Explore Other Industries
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {industries
              .filter(ind => ind.id !== currentIndustry.id)
              .slice(0, 4)
              .map(ind => (
                <Link
                  key={ind.id}
                  to={`/industries/${ind.slug}`}
                  className="block group"
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <div className="aspect-w-3 aspect-h-2">
                      <img 
                        src={ind.imageUrl} 
                        alt={ind.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                      <div className="p-4">
                        <h3 className="text-white font-medium group-hover:text-primary-300 transition-colors">
                          {ind.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default IndustryPage;