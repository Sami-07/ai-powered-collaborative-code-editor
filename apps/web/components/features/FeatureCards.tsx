"use client";

import { FaArrowRight } from "react-icons/fa6";

// Type definition for a feature
export interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeatureCardsProps {
  features: Feature[];
}

export default function FeatureCards({ features }: FeatureCardsProps) {
  // Function to handle smooth scrolling to a section
  const scrollToSection = (sectionId: string) => {

    document.getElementById(sectionId)?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {
        features.map((feature: Feature, index: number) => {
          // Create different gradient backgrounds based on the feature index
          const gradients = [
            "from-indigo-50 to-purple-50", // Collaboration
            "from-blue-50 to-indigo-50",   // Jarvis AI
            "from-purple-50 to-pink-50",   // Real-time Chat
            "from-amber-50 to-orange-50",  // Instant Execution
          ];
          
          const iconBgs = [
            "bg-indigo-100 text-indigo-600", // Collaboration
            "bg-blue-100 text-blue-600",     // Jarvis AI
            "bg-purple-100 text-purple-600", // Real-time Chat
            "bg-amber-100 text-amber-600",   // Instant Execution
          ];
          
          // Create section IDs based on feature titles
          const sectionId = feature.title.toLowerCase().replace(/\s+/g, '-');
          
          return (
            <div key={feature.title} className="group" onClick={() => scrollToSection(sectionId)}>
              <div className={`h-full rounded-2xl overflow-hidden border border-gray-100 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-indigo-100 bg-gradient-to-br ${gradients[index % gradients.length]}`}>
                <div className="p-8 flex flex-col h-full">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-xl ${iconBgs[index % iconBgs.length]} text-4xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-700 transition-colors duration-300">
                        {feature.title}
                      </h3>
                      <div className="w-12 h-1 bg-indigo-500 rounded mt-2 mb-3 group-hover:w-full transition-all duration-300"></div>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                  
                  <button 
                    
                    className="mt-auto pt-4 flex items-center text-indigo-600 font-medium group-hover:text-indigo-800 transition-colors duration-300"
                  >
                    <span>Explore feature</span>
                    <FaArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      }
    </div>
  );
} 