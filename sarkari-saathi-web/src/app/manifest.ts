import type { MetadataRoute } from "next";

// Makes the site installable ("Add to home screen") and gives it an app-like window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sarkari Saathi — Your Guide to Government Schemes",
    short_name: "Sarkari Saathi",
    description:
      "Find central and state government schemes you are eligible for, check eligibility and reach the official application page.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f6",
    theme_color: "#1a5f3f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
