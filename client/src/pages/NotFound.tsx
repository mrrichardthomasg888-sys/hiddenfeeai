import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BrandIdentity } from "@/components/brand/BrandIdentity";

export function NotFound() {
  return (
    <div className="premium-page flex min-h-screen flex-col items-center justify-center gap-5 bg-[#050911] px-6 text-center">
      <BrandIdentity />
      <p className="text-sm font-extrabold uppercase tracking-[.18em] text-[#73b8ff]">Error 404</p>
      <h1 className="text-3xl font-black text-white">Page not found</h1>
      <p className="max-w-sm text-base leading-[1.7] text-[#dce4ec]">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
