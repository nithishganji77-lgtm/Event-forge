import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// z.string().url() accepts any scheme, including javascript: and data:. A URL that is stored and
// later rendered as a link (a venue's map link) or an image must be plain http(s), or whoever can
// edit an event could plant a script that runs in the viewer's session.
export const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), 'Must be an http(s) URL');
