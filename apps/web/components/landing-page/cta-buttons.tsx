"use client";

import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
export default function CTAButtons() {
  const router = useRouter();
  return (
    <div className="flex gap-4 pt-8">
      <Button size="lg" onClick={() => {
        router.push('/sign-up');
      }}>
        Get Started
      </Button>
      <Button size="lg" variant="outline" onClick={() => {
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
          featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
      }}>
        View Features
      </Button>
    </div>
  );
}
