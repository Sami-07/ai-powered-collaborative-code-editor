"use client";


import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export function SignUpButton() {
  const router = useRouter();
  return (
    <Button size="lg" onClick={() => {
      router.push('/sign-up');
    }}>
      Sign Up Free
    </Button>
  );
}