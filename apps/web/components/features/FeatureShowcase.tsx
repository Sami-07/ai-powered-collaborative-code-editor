"use client";

import React from "react";

// Type definition for a benefit/feature point
export interface Benefit {
  title: string;
  description: string;
}

// Props interface for the FeatureShowcase component
export interface FeatureShowcaseProps {
  id: string;
  emoji: string;
  title: string;
  description: string;
  videoPoster: string;
  videoSource: string;
  benefits?: Benefit[];
  gradientFrom?: string;
  gradientTo?: string;
  children?: React.ReactNode; // For custom content like the chat UI
}

export default function FeatureShowcase({
  id,
  emoji,
  title,
  description,
  videoPoster,
  videoSource,
  benefits = [],
  gradientFrom = "indigo-50",
  gradientTo = "indigo-100/50",
  children,
}: FeatureShowcaseProps) {
  return (
    <div 
      id={id} 
      className="rounded-2xl bg-white shadow-xl overflow-hidden border border-indigo-100 mb-20 hover:shadow-indigo-100/40 transition-shadow duration-300"
    >
      <div className={`border-b border-gray-100 bg-gradient-to-r from-${gradientFrom} to-${gradientTo} p-6`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-full">
            <span className="text-4xl">{emoji}</span>
          </div>
          <h3 className="text-2xl font-bold text-indigo-600">{title}</h3>
        </div>
      </div>
      
      <div className="p-6">
      {children}
        {videoSource && (
          <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg mb-8 max-w-3xl mx-auto">
            <div className="bg-[#1E1E1E] p-2 flex items-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="mx-auto font-mono text-xs text-gray-400">CodeCollab - {title}</div>
            </div>
            <video
              className="w-full h-auto aspect-video"
              controls
              poster={videoPoster}
            >
              <source src={videoSource} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
        
        <div className="space-y-6 px-2 max-w-5xl mx-auto">
          <p className="text-lg text-gray-700 leading-relaxed">
            {description}
          </p>
          
          {benefits.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-indigo-50 p-4 rounded-lg hover:bg-indigo-100/70 transition-colors duration-300">
                  <div className="flex items-start gap-2">
                    <span className="text-indigo-500 mt-1 bg-white p-1 rounded-full">✓</span>
                    <div>
                      <h4 className="font-medium">{benefit.title}</h4>
                      <p className="text-sm text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
       
        </div>
      </div>
    </div>
  );
} 