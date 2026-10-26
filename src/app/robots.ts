import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"], // Protect private API endpoints from indexing
    },
    sitemap: "https://40clues.com/sitemap.xml",
  };
}