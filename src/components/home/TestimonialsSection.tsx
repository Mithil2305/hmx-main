import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  company: string;
  role: string;
  testimonial: string;
  imageUrl: string;
  videoUrl?: string;
  industry: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    company: "Boutique Haven",
    role: "Owner",
    testimonial: "The FPV tour completely transformed our online presence. Customers now spend more time on our website and come into the store already familiar with our layout. Sales have increased by 30% since we added the tour to our website.",
    imageUrl: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    videoUrl: "https://player.vimeo.com/video/371568351",
    industry: "Retail"
  },
  {
    id: 2,
    name: "Michael Rodriguez",
    company: "Skyline Realty",
    role: "Principal Broker",
    testimonial: "We've cut our in-person showings in half while increasing serious offers. Clients arrive already emotionally connected to properties after experiencing them through the FPV tours. It's been a game-changer for our brokerage.",
    imageUrl: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    videoUrl: "https://player.vimeo.com/video/636789211",
    industry: "Real Estate"
  },
  {
    id: 3,
    name: "Jennifer Lee",
    company: "Oceanfront Resort",
    role: "Marketing Director",
    testimonial: "The FPV tour of our resort captured the true essence of our property in a way traditional videos never could. Our direct bookings have increased by 45% since implementing the tour on our website and social media.",
    imageUrl: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    videoUrl: "https://player.vimeo.com/video/370139457",
    industry: "Hospitality"
  },
  {
    id: 4,
    name: "David Chen",
    company: "Revolution Fitness",
    role: "Owner",
    testimonial: "We've seen a significant decrease in the 'intimidation factor' that prevents many people from joining gyms. New member sign-ups are up 25% since adding the FPV tour to our marketing materials and website.",
    imageUrl: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    videoUrl: "https://player.vimeo.com/video/377871529",
    industry: "Fitness"
  }
];

const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState("");
  
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  const openVideoModal = (videoUrl: string) => {
    setCurrentVideo(videoUrl);
    setVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setVideoModalOpen(false);
    setCurrentVideo("");
  };

  return (
    <section className="py-16 md:py-24 bg-primary-950 text-white">
      <div className="container mx-auto px-4">
        <motion.div 
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Hear From Our Clients
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Businesses across industries are transforming their customer experience with our FPV virtual tours.
          </p>
        </motion.div>
        
        <div className="relative max-w-5xl mx-auto">
          {/* Carousel Controls */}
          <div className="absolute top-1/2 transform -translate-y-1/2 left-0 -ml-4 md:-ml-6 z-10">
            <button 
              onClick={handlePrev}
              className="bg-primary-800 p-2 rounded-full hover:bg-primary-700 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
          
          <div className="absolute top-1/2 transform -translate-y-1/2 right-0 -mr-4 md:-mr-6 z-10">
            <button 
              onClick={handleNext}
              className="bg-primary-800 p-2 rounded-full hover:bg-primary-700 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight size={24} />
            </button>
          </div>
          
          {/* Testimonial Carousel */}
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="bg-primary-900 rounded-xl p-6 md:p-8 shadow-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Photo and Info */}
              <div className="md:col-span-4 flex flex-col items-center md:items-start">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden mb-4">
                  <img 
                    src={testimonials[currentIndex].imageUrl} 
                    alt={testimonials[currentIndex].name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-semibold">{testimonials[currentIndex].name}</h3>
                  <p className="text-primary-400">{testimonials[currentIndex].role}</p>
                  <p className="text-gray-300">{testimonials[currentIndex].company}</p>
                  <span className="inline-block bg-primary-800 text-primary-200 px-3 py-1 text-sm rounded-full mt-2">
                    {testimonials[currentIndex].industry}
                  </span>
                </div>
                
                {testimonials[currentIndex].videoUrl && (
                  <button
                    onClick={() => openVideoModal(testimonials[currentIndex].videoUrl!)}
                    className="mt-6 flex items-center text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <div className="bg-primary-800 p-2 rounded-full mr-2">
                      <Play size={16} />
                    </div>
                    Watch Their Experience
                  </button>
                )}
              </div>
              
              {/* Right Column: Testimonial */}
              <div className="md:col-span-8">
                <div className="text-4xl text-primary-500 mb-2">"</div>
                <p className="text-lg text-gray-200 mb-6 italic">
                  {testimonials[currentIndex].testimonial}
                </p>
                
                <div className="text-lg text-gray-400">
                  Before: Standard photos and videos<br />
                  After: Immersive FPV virtual tour
                </div>
                
                <div className="mt-6 pt-6 border-t border-primary-800 flex justify-between">
                  <div>
                    <div className="text-primary-400 font-semibold">Website Visitors</div>
                    <div className="flex items-end space-x-1">
                      <span className="text-2xl font-bold">↑ 40%</span>
                      <span className="text-gray-400 text-sm">average increase</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-primary-400 font-semibold">Conversion Rate</div>
                    <div className="flex items-end space-x-1">
                      <span className="text-2xl font-bold">↑ 35%</span>
                      <span className="text-gray-400 text-sm">average increase</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Carousel Indicators */}
          <div className="flex justify-center space-x-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2.5 h-2.5 rounded-full ${
                  index === currentIndex ? 'bg-primary-400' : 'bg-primary-800'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              ></button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Video Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-primary-900 rounded-xl overflow-hidden relative max-w-4xl w-full">
            <button
              onClick={closeVideoModal}
              className="absolute top-4 right-4 bg-primary-800 p-2 rounded-full hover:bg-primary-700 transition-colors z-10"
              aria-label="Close video"
            >
              <X size={24} />
            </button>
            
            <div className="aspect-w-16 aspect-h-9">
              <iframe
                src={`${currentVideo}?autoplay=1`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// This is temporarily defined here to fix the missing import error
// In a real application, you would import X from lucide-react
const X: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export default TestimonialsSection;