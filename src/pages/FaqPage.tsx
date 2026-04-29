import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: React.ReactNode;
  category: string;
}

const FaqPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('general');
  
  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
    
    // Update page title
    document.title = 'FAQ - HMX FPV Tours';
  }, []);

  const toggleFaq = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const faqItems: FaqItem[] = [
    {
      question: "What is an FPV tour?",
      answer: (
        <div>
          <p className="mb-4">
            FPV (First Person View) tours are immersive video experiences captured by specially designed drones and cameras that put your customers in the pilot's seat. Unlike traditional videos or virtual tours, FPV footage flows seamlessly through spaces, creating a dynamic, cinematic experience.
          </p>
          <p>
            The result is a fluid journey through your business that feels natural and engaging, allowing viewers to experience your space as if they were actually there.
          </p>
        </div>
      ),
      category: "general"
    },
    {
      question: "How is an FPV tour different from regular drone footage?",
      answer: (
        <div>
          <p className="mb-4">
            Traditional drone footage typically captures aerial views from a distance, while FPV tours create a seamless journey that can transition from outdoors to indoors and navigate through tight spaces.
          </p>
          <p>
            FPV drones are smaller, more agile, and piloted by specially trained operators who can fly through doorways, around corners, and close to objects with precision. The resulting footage feels like a single, continuous journey rather than a series of static shots.
          </p>
        </div>
      ),
      category: "general"
    },
    {
      question: "How long does an FPV filming session take?",
      answer: (
        <p>
          The duration of an FPV filming session depends on the size and complexity of your space. For most businesses, we allocate 2-4 hours for the complete filming process. This includes setup time, multiple flight paths, and ensuring we capture all the key features of your business. For larger venues or complex shoots, we may recommend a longer session or multiple sessions.
        </p>
      ),
      category: "process"
    },
    {
      question: "What's the typical turnaround time for the final video?",
      answer: (
        <p>
          Our standard turnaround time is 5-7 business days from the filming date to delivery of the final edited video. For urgent requests, we offer expedited services that can deliver the final product in as little as 48 hours for an additional fee. During peak seasons, turnaround times may be slightly longer.
        </p>
      ),
      category: "process"
    },
    {
      question: "How much does an FPV tour cost?",
      answer: (
        <div>
          <p className="mb-4">
            Our pricing varies based on several factors:
          </p>
          <ul className="list-disc pl-5 mb-4 space-y-2">
            <li>Size and complexity of your space</li>
            <li>Duration of the final video</li>
            <li>Additional editing requirements (music, graphics, etc.)</li>
            <li>Location (travel fees may apply)</li>
          </ul>
          <p>
            Basic packages start at $1,500 for smaller spaces, while comprehensive packages for larger venues typically range from $2,500 to $5,000. We provide detailed quotes after understanding your specific needs.
          </p>
        </div>
      ),
      category: "pricing"
    },
    {
      question: "Are there any special requirements for the filming day?",
      answer: (
        <div>
          <p className="mb-4">
            To ensure a successful filming day, we recommend:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Ensuring your space is tidy and well-presented</li>
            <li>Informing staff about the filming schedule</li>
            <li>Minimizing customer traffic if possible (though we can work around this)</li>
            <li>Having key areas and features you want highlighted ready to showcase</li>
            <li>Providing access to all areas you want included in the tour</li>
          </ul>
        </div>
      ),
      category: "process"
    },
    {
      question: "Can you incorporate specific branding elements in the tour?",
      answer: (
        <p>
          Absolutely! We can incorporate your logo, brand colors, and messaging into the final video. We also offer custom graphics, text overlays, and transitions that align with your brand identity. During the planning phase, we'll discuss your branding requirements and ensure they're seamlessly integrated into the final product.
        </p>
      ),
      category: "customization"
    },
    {
      question: "How do I share or use the FPV tour once it's completed?",
      answer: (
        <div>
          <p className="mb-4">
            Your completed FPV tour is delivered in multiple formats optimized for different platforms:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>High-resolution version for your website</li>
            <li>Optimized versions for social media platforms</li>
            <li>Embed codes for easy integration into your website</li>
            <li>Mobile-friendly version</li>
          </ul>
          <p className="mt-4">
            We also provide guidance on how to effectively use your tour in marketing campaigns, email newsletters, and advertising.
          </p>
        </div>
      ),
      category: "technical"
    },
    {
      question: "Is there a risk of damage to my property during filming?",
      answer: (
        <p>
          Our pilots are highly skilled professionals with extensive experience flying in various environments. We use lightweight, professional-grade FPV drones specifically designed for indoor and precise flying. Additionally, we carry comprehensive insurance coverage for all our shoots. While the risk is minimal, our insurance provides complete protection in the unlikely event of any incident.
        </p>
      ),
      category: "safety"
    },
    {
      question: "What types of businesses benefit most from FPV tours?",
      answer: (
        <div>
          <p className="mb-4">
            FPV tours provide significant value to a wide range of businesses, including:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Retail stores wanting to showcase their shopping experience</li>
            <li>Restaurants highlighting their atmosphere and spaces</li>
            <li>Hotels and resorts displaying their amenities and accommodations</li>
            <li>Real estate properties demonstrating flow and features</li>
            <li>Event venues showcasing their capabilities</li>
            <li>Fitness centers reducing the intimidation factor for new members</li>
            <li>Automotive dealerships highlighting their showroom and services</li>
            <li>Educational institutions presenting their campus</li>
            <li>Warehouses and industrial facilities demonstrating their operations</li>
          </ul>
        </div>
      ),
      category: "general"
    },
    {
      question: "Can you film during business hours or do you need to shoot after hours?",
      answer: (
        <p>
          We can film during regular business hours, and many clients prefer this to capture the authentic atmosphere of their space. Our experienced pilots can work around customers and staff with minimal disruption. However, for businesses with high foot traffic or those wanting to highlight specific setups, after-hours filming may be preferable. We'll discuss the best timing for your specific situation during the planning phase.
        </p>
      ),
      category: "process"
    },
    {
      question: "Do you handle post-production or just the filming?",
      answer: (
        <p>
          Our service includes complete end-to-end production. We handle all aspects from planning and filming to professional editing, color grading, audio integration, and final delivery. Our post-production team will enhance your footage with music, sound effects, graphics, and text as needed to create a polished, professional final product that aligns with your brand and objectives.
        </p>
      ),
      category: "process"
    }
  ];

  const filteredFaqs = faqItems.filter(item => item.category === activeCategory);
  
  const categories = [
    { id: "general", name: "General Information" },
    { id: "process", name: "Process & Timing" },
    { id: "pricing", name: "Pricing & Packages" },
    { id: "customization", name: "Customization" },
    { id: "technical", name: "Technical Details" },
    { id: "safety", name: "Safety & Insurance" }
  ];

  return (
    <div className="pt-20 min-h-screen">
      {/* Page Header */}
      <div className="bg-primary-950 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-200">
              Find answers to common questions about our FPV virtual tour services.
            </p>
          </div>
        </div>
      </div>
      
      {/* FAQ Content */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-md text-sm md:text-base transition-colors ${
                    activeCategory === category.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
            
            {/* FAQs */}
            <div className="space-y-4">
              <h2 className="text-2xl font-heading font-semibold text-primary-950 mb-6">
                {categories.find(c => c.id === activeCategory)?.name}
              </h2>
              
              {filteredFaqs.map((faq, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="flex justify-between items-center w-full p-6 text-left bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg font-medium text-primary-900">
                      {faq.question}
                    </span>
                    <span className="text-primary-600 ml-4">
                      {activeIndex === index ? (
                        <Minus size={20} />
                      ) : (
                        <Plus size={20} />
                      )}
                    </span>
                  </button>
                  
                  {activeIndex === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                      className="p-6 bg-gray-50 text-gray-700"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {/* Still Have Questions */}
            <div className="mt-12 pt-12 border-t border-gray-200 text-center">
              <h3 className="text-2xl font-heading font-semibold text-primary-950 mb-4">
                Still Have Questions?
              </h3>
              <p className="text-gray-700 mb-6">
                Our team is here to help with any other questions you might have about our FPV virtual tour services.
              </p>
              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <a 
                  href="mailto:info@hmx.com" 
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md transition-colors"
                >
                  Email Us
                </a>
                <a 
                  href="tel:+15551234567" 
                  className="border border-primary-600 text-primary-600 hover:bg-primary-50 px-6 py-3 rounded-md transition-colors"
                >
                  Call Us: (555) 123-4567
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;