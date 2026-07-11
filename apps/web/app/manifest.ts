import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MSMEMate — Bridging Bharat's Businesses",
    short_name: "MSMEMate",
    description:
      "Voice-first AI onboarding that takes India's MSMEs from Udyam registration to selling on ONDC — in their own language.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8F9FC",
    theme_color: "#0B1437",
    lang: "en-IN",
    categories: ["business", "productivity", "government"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Register your business",
        url: "/register",
        description: "Voice-first MSE registration with Sathi",
      },
      {
        name: "Classify with VargBot",
        url: "/classify",
        description: "Find your ONDC category",
      },
    ],
  };
}
