import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Book, FileText, Video, Users, DollarSign } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: 'general' | 'orders' | 'payments' | 'users';
}

const faqs: FAQ[] = [
  {
    question: 'How do I create a new order?',
    answer: 'To create a new order, click on the "Orders" tab in the sidebar, then click the "Create New Order" button. Fill in the required information about the client, pilot, and video details.',
    category: 'orders'
  },
  {
    question: 'How do I manage pilots?',
    answer: 'Go to the "Pilots" section in the sidebar. Here you can view all pilots, add new pilots, edit existing pilot information, and manage their availability.',
    category: 'users'
  },
  {
    question: 'How do I process payments?',
    answer: 'Navigate to the "Payments" section. You can view all transactions, process new payments, and generate payment reports. Make sure to verify the payment details before confirming.',
    category: 'payments'
  },
  {
    question: 'How do I handle video reviews?',
    answer: 'In the "Video Review" section, you can view both before and after videos. Use the review tools to provide feedback and approve or request changes to the videos.',
    category: 'general'
  },
  {
    question: 'How do I manage user roles?',
    answer: 'Go to the "Settings" section and look for "User Management". Here you can assign roles, manage permissions, and control access levels for different users.',
    category: 'users'
  },
  {
    question: 'How do I generate reports?',
    answer: 'Each section (Orders, Payments, etc.) has a "Generate Report" option. Select the date range and type of report you need, then click generate to download the report.',
    category: 'general'
  }
];

const Help: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaqs(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'general', label: 'General', icon: <Book size={20} /> },
    { id: 'orders', label: 'Orders', icon: <FileText size={20} /> },
    { id: 'payments', label: 'Payments', icon: <DollarSign size={20} /> },
    { id: 'users', label: 'Users', icon: <Users size={20} /> }
  ];

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Help Center</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for help..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md"
          />
          <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              className={`flex items-center px-4 py-2 rounded-md ${
                selectedCategory === category.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon}
              <span className="ml-2">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="space-y-4">
        {filteredFaqs.map((faq, index) => (
          <div key={index} className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleFaq(index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left"
            >
              <span className="font-medium">{faq.question}</span>
              {expandedFaqs.includes(index) ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>
            {expandedFaqs.includes(index) && (
              <div className="px-6 pb-4 text-gray-600">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact Support */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Need More Help?</h2>
        <p className="text-gray-600 mb-4">
          If you couldn't find what you're looking for, our support team is here to help.
        </p>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <Book size={20} className="text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium">Documentation</h3>
              <p className="text-sm text-gray-500">
                <a href="#" className="text-primary-600 hover:underline">
                  View our detailed documentation
                </a>
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <Video size={20} className="text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium">Video Tutorials</h3>
              <p className="text-sm text-gray-500">
                <a href="#" className="text-primary-600 hover:underline">
                  Watch our video tutorials
                </a>
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <Users size={20} className="text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-medium">Contact Support</h3>
              <p className="text-sm text-gray-500">
                Email: support@hmx.com<br />
                Phone: +91 1234567890
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help; 