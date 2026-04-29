import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react';
import { industries } from '../../data/industries';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [pilotsOpen, setPilotsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Close mobile menu when navigating
    setIsOpen(false);
    
    // Add scroll event listener
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleIndustries = () => setIndustriesOpen(!industriesOpen);
  const togglePilots = () => setPilotsOpen(!pilotsOpen);

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled || isOpen
          ? 'bg-primary-950 shadow-lg'
          : 'bg-white shadow-sm'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className={`font-heading font-bold text-2xl flex items-center ${
            isScrolled || isOpen ? 'text-white' : 'text-gray-900'
          }`}>
            <span className={`mr-1 ${isScrolled || isOpen ? 'text-primary-400' : 'text-primary-600'}`}>H</span>MX
          </Link>
          
          {/* Mobile Menu Button */}
          <button 
            onClick={toggleMenu}
            className={`lg:hidden hover:text-primary-400 ${
              isScrolled || isOpen ? 'text-white' : 'text-gray-900'
            }`}
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            {/* Industries Dropdown */}
            <div className="relative group">
              <button 
                onClick={toggleIndustries}
                className={`flex items-center hover:text-primary-400 ${
                  isScrolled || isOpen ? 'text-white' : 'text-gray-700'
                }`}
              >
                Industries
                {industriesOpen ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
              </button>
              
              {industriesOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg py-2 z-50">
                  {industries.map((industry) => (
                    <Link
                      key={industry.slug}
                      to={`/industries/${industry.slug}`}
                      className="block px-4 py-2 text-sm text-gray-800 hover:bg-primary-50 hover:text-primary-700"
                      onClick={() => setIndustriesOpen(false)}
                    >
                      {industry.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            {/* Pilots & Referrals Dropdown */}
            <div className="relative group">
              <button 
                onClick={togglePilots}
                className={`flex items-center hover:text-primary-400 ${
                  isScrolled || isOpen ? 'text-white' : 'text-gray-700'
                }`}
              >
                Pilots & Referrals
                {pilotsOpen ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
              </button>
              
              {pilotsOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg py-2 z-50">
                  <Link
                    to="/pilots-referrals#pilots"
                    className="block px-4 py-2 text-sm text-gray-800 hover:bg-primary-50 hover:text-primary-700"
                    onClick={() => setPilotsOpen(false)}
                  >
                    For Pilots
                  </Link>
                  <Link
                    to="/pilots-referrals#referrals"
                    className="block px-4 py-2 text-sm text-gray-800 hover:bg-primary-50 hover:text-primary-700"
                    onClick={() => setPilotsOpen(false)}
                  >
                    For Referrals
                  </Link>
                </div>
              )}
            </div>
            
            <Link to="/faq" className={`hover:text-primary-400 ${
              isScrolled || isOpen ? 'text-white' : 'text-gray-700'
            }`}>
              FAQ
            </Link>
            
            <Link to="/about" className={`hover:text-primary-400 ${
              isScrolled || isOpen ? 'text-white' : 'text-gray-700'
            }`}>
              About Us
            </Link>
            
            <Link to="/login" className={`hover:text-primary-400 border px-5 py-2 rounded-md ${
              isScrolled || isOpen 
                ? 'text-white border-primary-400' 
                : 'text-gray-700 border-gray-300 hover:border-primary-400'
            }`}>
              Login
            </Link>
            
            <Link to="/signup" className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-2 rounded-md transition-all duration-300 transform hover:scale-105">
              Get Started
            </Link>
          </nav>
        </div>
        
        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden bg-primary-950">
            <div className="py-4 space-y-4">
              {/* Industries Dropdown Mobile */}
              <div>
                <button 
                  onClick={toggleIndustries}
                  className="flex items-center justify-between w-full text-white hover:text-primary-400 py-2"
                >
                  Industries
                  {industriesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {industriesOpen && (
                  <div className="pl-4 space-y-2 mt-2">
                    {industries.map((industry) => (
                      <Link
                        key={industry.slug}
                        to={`/industries/${industry.slug}`}
                        className="block py-1 text-gray-200 hover:text-primary-400"
                        onClick={() => setIsOpen(false)}
                      >
                        {industry.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Pilots & Referrals Dropdown Mobile */}
              <div>
                <button 
                  onClick={togglePilots}
                  className="flex items-center justify-between w-full text-white hover:text-primary-400 py-2"
                >
                  Pilots & Referrals
                  {pilotsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {pilotsOpen && (
                  <div className="pl-4 space-y-2 mt-2">
                    <Link
                      to="/pilots-referrals#pilots"
                      className="block py-1 text-gray-200 hover:text-primary-400"
                      onClick={() => setIsOpen(false)}
                    >
                      For Pilots
                    </Link>
                    <Link
                      to="/pilots-referrals#referrals"
                      className="block py-1 text-gray-200 hover:text-primary-400"
                      onClick={() => setIsOpen(false)}
                    >
                      For Referrals
                    </Link>
                  </div>
                )}
              </div>
              
              <Link to="/faq" className="block text-white hover:text-primary-400 py-2" onClick={() => setIsOpen(false)}>
                FAQ
              </Link>
              
              <Link to="/about" className="block text-white hover:text-primary-400 py-2" onClick={() => setIsOpen(false)}>
                About Us
              </Link>
              
              <div className="flex flex-col space-y-2 pt-2">
                <Link to="/login" className="text-white hover:text-primary-400 border border-primary-400 px-5 py-2 rounded-md text-center" onClick={() => setIsOpen(false)}>
                  Login
                </Link>
                
                <Link to="/signup" className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-2 rounded-md transition-all duration-300 transform hover:scale-105 text-center" onClick={() => setIsOpen(false)}>
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;