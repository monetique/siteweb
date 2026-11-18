import fs from 'node:fs';
import type { Core } from '@strapi/strapi';

/**
 * Contrôle le contenu réel des fichiers téléversés (signature binaire) : un fichier HTML ou un script
 * renommé en « .png » ou « .pdf » est refusé, quel que soit le type annoncé par le navigateur.
 */
const SIGNATURES: { label: string; test: (b: Buffer) => boolean }[] = [
  { label: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { label: 'jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { label: 'gif', test: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
  { label: 'webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { label: 'avif', test: (b) => b.subarray(4, 12).toString('latin1').startsWith('ftypavi') },
  { label: 'pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { label: 'office (docx/xlsx/pptx)', test: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 },
  { label: 'office (doc/xls)', test: (b) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
];

const isUploadRoute = (path: string, method: string) =>
  method === 'POST' && (path === '/upload' || path === '/api/upload' || path.startsWith('/upload?'));

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    if (isUploadRoute(ctx.path, ctx.method) && ctx.request.files) {
      const files = Object.values(ctx.request.files).flat() as any[];
      for (const file of files) {
        const filepath = file.filepath || file.path;
        if (!filepath) continue;
        const head = Buffer.alloc(16);
        const fd = fs.openSync(filepath, 'r');
        fs.readSync(fd, head, 0, 16, 0);
        fs.closeSync(fd);
        if (!SIGNATURES.some((s) => s.test(head))) {
          strapi.log.warn(`[upload-guard] fichier refusé : ${file.originalFilename || file.name} (contenu non reconnu)`);
          return ctx.badRequest('Type de fichier non autorisé : seuls les images, PDF et documents Office sont acceptés.');
        }
      }
    }
    await next();
  };
};
