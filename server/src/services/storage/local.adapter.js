import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { config } from '../../config/env.js';

const EVENTS_SUBDIR = 'events';

const extensionByMimetype = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Contract: upload(buffer, {filename, mimetype}) => { url, publicId }; remove(publicId) => void
export const localAdapter = {
  name: 'local',

  async upload(buffer, { mimetype } = {}) {
    const ext = extensionByMimetype[mimetype] || path.extname(mimetype || '') || '.bin';
    const filename = `${randomUUID()}${ext}`;
    const dir = path.resolve(config.STORAGE_LOCAL_DIR, EVENTS_SUBDIR);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), buffer);

    return {
      url: `${config.SERVER_BASE_URL}/uploads/${EVENTS_SUBDIR}/${filename}`,
      publicId: filename,
    };
  },

  async remove(publicId) {
    const filePath = path.resolve(config.STORAGE_LOCAL_DIR, EVENTS_SUBDIR, publicId);
    await fs.unlink(filePath).catch(() => {});
  },
};
