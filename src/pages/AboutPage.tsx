import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { PenTool, Video, Award, Users } from 'lucide-react';

const AboutPage: React.FC = () => {
  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);
    
    // Update page title
    document.title = 'About Us - HMX FPV Tours';
  }, []);

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
    <div className="pt-20 min-h-screen">
      {/* Hero Section */}
      <div className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950 to-primary-900 z-0"></div>
        <div className="absolute inset-0 opacity-20 z-0">
          <div className="absolute inset-0 bg-grid-white/[0.2] bg-[length:20px_20px]" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6">
              About HMX
            </h1>
            <p className="text-xl text-gray-200 mb-8">
              HMX is a creative drone innovation company specializing in immersive FPV drone walkthroughs that capture the "real vibe" of locations. We bring details to life through cinematic motion for restaurants, resorts, adventure parks, and more. HMX is a movement redefining travel, marketing, and experience in the 21st century by merging storytelling with drone tech.
            </p>
          </div>
        </div>
      </div>
      
      {/* Our Story Section */}
      <section ref={ref} className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate={inView ? "show" : "hidden"}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            >
              {/* Image Column */}
              <motion.div variants={itemVariants} className="relative rounded-xl overflow-hidden shadow-xl">
                <img 
                  src="https://images.pexels.com/photos/7149150/pexels-photo-7149150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                  alt="FPV Drone Pilot" 
                  className="w-full h-auto"
                />
              </motion.div>
              
              {/* Content Column */}
              <div>
                <motion.h2 
                  variants={itemVariants} 
                  className="text-3xl font-heading font-bold text-primary-950 mb-4"
                >
                  Our Story
                </motion.h2>
                
                <motion.p variants={itemVariants} className="text-gray-700 mb-4">
                  HMX was founded in 2023 by a team of passionate FPV drone pilots, videographers, and marketing professionals who saw the untapped potential of FPV technology for businesses.
                </motion.p>
                
                <motion.p variants={itemVariants} className="text-gray-700 mb-4">
                  What began as a small operation has quickly grown into a nationwide network of skilled pilots and creative professionals dedicated to helping businesses showcase their spaces in the most immersive way possible.
                </motion.p>
                
                <motion.p variants={itemVariants} className="text-gray-700 mb-4">
                  <strong>Mission:</strong> To pioneer immersive visual storytelling using advanced FPV drone technology, helping businesses present their spaces and creating opportunities through a pilot-driven franchise model.
                </motion.p>
                
                <motion.p variants={itemVariants} className="text-gray-700">
                  <strong>Vision:</strong> To become the global benchmark for FPV experience marketing, enabling people to explore the world through drones even before stepping out of their homes.
                </motion.p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Our Values Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-950 mb-4">
              Our Values
            </h2>
            <p className="text-lg text-gray-700">
              The principles that guide our work and relationships with clients
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: <span className="text-2xl font-heading font-bold text-primary-600">HMX</span>,
                title: "Innovation",
                description: "We continuously push the boundaries of what's possible with FPV technology to deliver cutting-edge experiences."
              },
              {
                icon: <PenTool size={36} className="text-primary-600" />,
                title: "Creativity",
                description: "Every project benefits from our creative approach to visual storytelling and unique perspective."
              },
              {
                icon: <Award size={36} className="text-primary-600" />,
                title: "Excellence",
                description: "We maintain the highest standards of quality in every aspect of our work, from filming to final delivery."
              },
              {
                icon: <Users size={36} className="text-primary-600" />,
                title: "Partnership",
                description: "We view our clients as partners, working collaboratively to achieve their specific goals and vision."
              }
            ].map((value, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg shadow-md p-6 text-center"
              >
                <div className="flex justify-center mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-heading font-semibold text-primary-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-700">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* How We've Grown Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-950 mb-4">
                Our Journey
              </h2>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                From our founding to today, we've grown rapidly while maintaining our commitment to quality
              </p>
            </div>
            
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-1 bg-primary-100 transform md:translate-x-[-50%]"></div>
              
              {/* Timeline Items */}
              <div className="space-y-12">
                {[
                  {
                    year: "2023",
                    title: "Company Founded",
                    description: "HMX was founded by a team of drone enthusiasts and marketing professionals in San Francisco.",
                    position: "left"
                  },
                  {
                    year: "2023",
                    title: "First 50 Clients",
                    description: "Within six months, we completed our first 50 client projects and expanded to Los Angeles and New York.",
                    position: "right"
                  },
                  {
                    year: "2024",
                    title: "Nationwide Expansion",
                    description: "Launched our pilot network program, bringing on board talented FPV pilots in 10 major cities across the US.",
                    position: "left"
                  },
                  {
                    year: "2025",
                    title: "Today",
                    description: "HMX now serves clients in over 15 industries with a network of 50+ certified pilots and counting.",
                    position: "right"
                  }
                ].map((item, index) => (
                  <div key={index} className={`relative flex items-center ${
                    index % 2 === 0 ? 'md:justify-end' : 'md:justify-start'
                  }`}>
                    {/* Timeline Point */}
                    <div className="absolute left-[-8px] md:left-1/2 md:transform md:translate-x-[-50%] w-4 h-4 bg-primary-500 rounded-full border-4 border-white"></div>
                    
                    {/* Content */}
                    <div className={`relative bg-white rounded-lg shadow-md p-6 mx-6 md:mx-0 ${
                      index % 2 === 0 
                        ? 'md:mr-[50%] md:ml-0 md:pr-16 md:text-right' 
                        : 'md:ml-[50%] md:pl-16'
                    } max-w-full md:max-w-[calc(50%-40px)] z-10`}>
                      <div className="text-primary-500 font-bold mb-2">{item.year}</div>
                      <h3 className="text-xl font-heading font-semibold text-primary-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-700">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Team Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-950 mb-4">
              Our Leadership Team
            </h2>
            <p className="text-lg text-gray-700">
              Meet the passionate experts behind HMX's success
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Alex Chen",
                role: "Founder & CEO",
                bio: "Former professional drone racer with 10+ years of experience in FPV technology and business leadership.",
                image: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
              },
              {
                name: "Sarah Johnson",
                role: "Creative Director",
                bio: "Award-winning videographer and editor with a background in commercial filmmaking and brand storytelling.",
                image: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
              },
              {
                name: "Marcus Rodriguez",
                role: "Head of Pilot Operations",
                bio: "Expert FPV pilot and trainer who oversees our nationwide network of professional drone operators.",
                image: "https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
              }
            ].map((member, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="h-64 overflow-hidden">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-heading font-semibold text-primary-900 mb-1">
                    {member.name}
                  </h3>
                  <p className="text-primary-500 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-700">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Join Us CTA */}
      <section className="py-16 md:py-24 bg-primary-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              Join Our Growing Network
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Whether you're a skilled FPV pilot or interested in partnering with us as a referral agent, we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link
                to="/pilot-signup"
                className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-md font-medium text-lg transition-colors"
              >
                Join as a Pilot
              </Link>
              <Link
                to="/referral-signup"
                className="border border-white hover:border-primary-300 hover:bg-white/10 text-white px-8 py-4 rounded-md font-medium text-lg transition-colors"
              >
                Become a Partner
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;