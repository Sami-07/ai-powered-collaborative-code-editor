import Link from "next/link";
import { FaGithub, FaTwitter, FaLinkedin, FaCode, FaDiscord, FaInstagram, FaXTwitter  } from "react-icons/fa6";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { cn } from "@/lib/utils";
import { socialMediaLinks } from "@/lib/constants";

// Map social media names to their icons and colors
const socialIconMap: Record<string, { icon: React.ReactNode; color: string; hoverBorderColor: string }> = {
  "X": { 
    icon: <FaXTwitter size={22} className="text-gray-600 group-hover:text-[#1DA1F2] transition-colors" />,
    color: "from-[#1DA1F2]/40 to-[#1DA1F2]/10",
    hoverBorderColor: "group-hover:border-blue-200"
  },
  "GitHub": { 
    icon: <FaGithub size={22} className="text-gray-600 group-hover:text-gray-800 transition-colors" />,
    color: "from-gray-800/40 to-gray-800/10",
    hoverBorderColor: "group-hover:border-gray-300"
  },
  "LinkedIn": { 
    icon: <FaLinkedin size={22} className="text-gray-600 group-hover:text-[#0077B5] transition-colors" />,
    color: "from-[#0077B5]/40 to-[#0077B5]/10",
    hoverBorderColor: "group-hover:border-blue-200"
  }
};

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          <Link href="/" className="flex items-center gap-2 group mb-8">
            <span className="text-indigo-600 text-3xl transition-transform group-hover:scale-110 duration-300">
              <FaCode />
            </span>
            <AnimatedGradientText className="text-2xl font-bold">
              CodeCollab
            </AnimatedGradientText>
          </Link>
          
          <div className="flex space-x-8 mb-8">
            {socialMediaLinks.map((social) => {
              const socialInfo = socialIconMap[social.name] || {
                icon: <FaTwitter size={22} className="text-gray-600 transition-colors" />,
                color: "from-gray-400/40 to-gray-400/10",
                hoverBorderColor: "group-hover:border-gray-300"
              };
              
              return (
                <a 
                  key={social.name}
                  href={social.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="group relative"
                  aria-label={`Visit our ${social.name} page`}
                >
                  <span className={cn(
                    "absolute inset-0 h-full w-full rounded-full bg-gradient-to-r",
                    socialInfo.color,
                    "blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  )}></span>
                  <div className={`relative bg-white p-3 rounded-full shadow-sm border border-gray-100 group-hover:shadow-md ${socialInfo.hoverBorderColor} transition-all duration-300`}>
                    {socialInfo.icon}
                  </div>
                </a>
              );
            })}
          </div>
          
          <div className="relative">
            <div 
              className="absolute inset-0 h-[1px] w-24 mx-auto bg-gradient-to-r from-transparent via-gray-300 to-transparent blur-sm"
            ></div>
            <p className="text-gray-500 text-sm pt-6 font-light">
              © {new Date().getFullYear().toString()} CodeCollab
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 