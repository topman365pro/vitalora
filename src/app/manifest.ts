import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vitaloria",
    short_name: "Vitaloria",
    description: "Wearable sensor PWA with BLE streaming, trends, and AI coaching.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
