import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"], // Protejează endpoint-urile private de la indexare
    },
    sitemap: "https://40clues.com/sitemap.xml",
  };
}