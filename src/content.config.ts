import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** Drafts render in `npm run dev` only and are left out of production builds and the feed. */
    draft: z.boolean().default(false),
    /** Optional public repository (`owner/name`) the post is about. */
    repo: z.string().optional(),
  }),
});

export const collections = { blog };
