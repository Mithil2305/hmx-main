import React, { useEffect } from 'react';
import HeroSection from '../components/home/HeroSection';
import WhatIsFpvSection from '../components/home/WhatIsFpvSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import CTASection from '../components/home/CTASection';

const HomePage: React.FC = () => {
  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
    
    // Update page title
    document.title = 'HMX - FPV Virtual Tours for Businesses';
  }, []);

  return (
    <div>
      <HeroSection />
      <WhatIsFpvSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
    </div>
  );
};

export default HomePage;