import Link from "next/link";
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { cn } from "@/lib/utils";
import { TextAnimate } from "@/components/magicui/text-animate";
import { NeonGradientCard } from "@/components/magicui/neon-gradient-card";
import { Button } from "@/components/ui/button";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { FaArrowRight } from "react-icons/fa6";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import FeatureCards from "../components/features/FeatureCards";
import FeatureShowcase, { FeatureShowcaseProps } from "../components/features/FeatureShowcase";
import { features, featureShowcases } from "@/lib/constants";
import { ScrollAnimation } from "@/components/ScrollAnimation";
import CTAButtons from "@/components/landing-page/cta-buttons";

// Type definition for a feature
interface Feature {
  icon: string;
  title: string;
  description: string;

}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden relative">
      

      {/* Background patterns */}
      <DotPattern className="absolute inset-0 opacity-50" />


      <main className="container mx-auto px-4 py-16 pt-24 relative z-10">
        {/* Hero Section */}
        <ScrollAnimation>
          <div className="flex flex-col lg:flex-row items-center gap-12 mt-16">
            <div className="lg:w-1/2 space-y-6">
              <div className="mb-8">
                <SparklesText
                  text="CodeCollab"
                  className="text-6xl lg:text-7xl font-extrabold"
                />
              </div>

              <TextAnimate
                animation="blurInUp"
                by="word"
                delay={0.1}
                duration={1.5}
                className="text-xl lg:text-2xl text-gray-700"
              >
                Experience the future of collaborative coding with real-time AI assistance and instant code execution.
              </TextAnimate>

              <CTAButtons />
            </div>

            {/* Demo Video Section */}
            <div className="lg:w-1/2 lg:mt-0">

              <div className="bg-black/80 w-full h-full rounded-lg overflow-hidden border  border-indigo-600 p-[2px] ">
                <video
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                >
                  <source src="/demos/demo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

            </div>
          </div>
        </ScrollAnimation>

        {/* Features Section */}
        <ScrollAnimation delay={0.3}>
          <div className="mt-32 mb-16">
            <h2 className="text-3xl font-bold text-center mb-6">
              <TextAnimate animation="fadeIn" className="text-indigo-600">
                Why Choose CodeCollab?
              </TextAnimate>
            </h2>
            <p className="text-gray-600 text-center max-w-3xl mx-auto mb-16">
              Our platform offers powerful tools that transform how teams collaborate on code
            </p>

            {/* Using the new FeatureCards component */}
            <FeatureCards features={features} />
          </div>
        </ScrollAnimation>

        {/* Feature Showcase Section */}
        <div className="mt-32 mb-20" id="features">
          <ScrollAnimation delay={0.4}>
            <h2 className="text-3xl font-bold text-center mb-6">
              <AnimatedGradientText className="text-4xl font-bold">
                See CodeCollab in Action
              </AnimatedGradientText>
            </h2>
            <p className="text-gray-600 text-center max-w-3xl mx-auto mb-16">
              Discover how our platform revolutionizes the coding experience with these powerful features
            </p>
          </ScrollAnimation>

          {/* Feature 1: Real-time Collaboration */}
          <ScrollAnimation delay={0.5}>
            <FeatureShowcase {...(featureShowcases[0] as FeatureShowcaseProps)} />
          </ScrollAnimation>
          
          {/* Feature 2: Jarvis AI Assistant */}
          <ScrollAnimation delay={0.5}>
            <FeatureShowcase {...(featureShowcases[1] as FeatureShowcaseProps)} />
          </ScrollAnimation>
          
          {/* Feature 3: Real-time Chat */}
          <ScrollAnimation delay={0.5}>
            <FeatureShowcase {...(featureShowcases[2] as FeatureShowcaseProps)}>
              <div className="mb-8">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 max-w-3xl mx-auto">
                  <div className="bg-indigo-600 p-3 text-white font-medium">
                    Team Chat - Project Falcon
                  </div>
                  <div className="h-64 p-4 bg-gray-50 overflow-y-auto">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                     EM
                      </div>
                      <div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-sm font-medium">Elon Musk</p>
                          <p className="text-gray-700">I'm working on the authentication flow. Anyone have experience with JWT tokens?</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">10:42 AM</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 mb-4 justify-end">
                      <div>
                        <div className="bg-indigo-100 p-3 rounded-lg shadow-sm">
                          <p className="text-sm font-medium">You</p>
                          <p className="text-gray-700">Yes, I implemented something similar last month. Let me share a code snippet.</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">10:43 AM</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                        ME
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 mb-4 justify-end">
                      <div>
                        <div className="bg-gray-800 p-3 rounded-lg shadow-sm font-mono text-xs text-green-400">
                          <p>const token = jwt.sign(</p>
                          <p>  {'{ userId: user.id }'}, </p>
                          <p>  process.env.JWT_SECRET,</p>
                          <p>  {'{ expiresIn: \'7d\' }'}</p>
                          <p>);</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">10:44 AM</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                        ME
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 border-t border-gray-200">
                    <div className="flex">
                      <input 
                        type="text" 
                        placeholder="Type a message..." 
                        className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button className="bg-indigo-600 text-white px-4 rounded-r-lg hover:bg-indigo-700">
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </FeatureShowcase>
          </ScrollAnimation>
          
          {/* Feature 4: Instant Execution */}
          <ScrollAnimation delay={0.5}>
            <FeatureShowcase {...(featureShowcases[3] as FeatureShowcaseProps)} />
          </ScrollAnimation>
        </div>

        {/* CTA Section */}
        <ScrollAnimation delay={0.6}>
          <div className="mt-24 mb-20 text-center">

            <div className="group relative mx-auto flex items-center justify-center rounded-full px-4 py-1.5 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] w-60">
              <span
                className={cn(
                  "absolute inset-0 block h-full w-60 animate-gradient rounded-[inherit] bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:300%_100%] p-[1px]",
                )}
                style={{
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "destination-out",
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "subtract",
                  WebkitClipPath: "padding-box",
                }}
              />
              ✨ <hr className="mx-2 h-4 w-px shrink-0 bg-neutral-500" />
              <AnimatedGradientText className="text-sm font-medium">
               Code Together
              </AnimatedGradientText>
              
            </div>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Join thousands of developers who are already experiencing the future of collaborative coding.
            </p>
            <SignUpButton />
          </div>
        </ScrollAnimation>
      </main>
      
      <Footer />
    </div>
  );
}

