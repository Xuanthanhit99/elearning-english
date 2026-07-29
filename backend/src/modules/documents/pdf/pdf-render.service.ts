import { createHash } from 'node:crypto';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import { renderDocumentHtml } from './pdf-template';

/**
 * Structured content -> HTML template -> headless Chromium -> PDF (spec
 * §19). A single shared Browser instance is launched lazily and reused
 * across renders — each render opens/closes its own page. Requires the
 * `chromium` package + its shared-lib dependencies to be present in the
 * backend Docker image (Alpine needs extra apk packages) — see final
 * report for the required Dockerfile change, which has NOT been applied
 * in this pass since it couldn't be verified without a container build
 * in this environment.
 */
@Injectable()
export class PdfRenderService {
  private readonly logger = new Logger(PdfRenderService.name);
  private browserPromise: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer
        .launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        })
        .catch((error) => {
          this.browserPromise = null;
          throw error;
        });
    }
    return this.browserPromise;
  }

  async renderDocument(input: {
    title: string;
    category: string;
    level: string | null;
    assembledContent: unknown;
  }): Promise<Buffer> {
    const html = renderDocumentHtml({
      title: input.title,
      category: input.category,
      level: input.level,
      content: input.assembledContent as never,
    });

    let browser: Browser;
    try {
      browser = await this.getBrowser();
    } catch (error) {
      this.logger.error(
        `Failed to launch Chromium for PDF render: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException('PDF renderer is unavailable.');
    }

    const page = await browser.newPage();
    try {
      // No external network resources are loaded (fonts/CSS are all
      // inline in the template), so 'domcontentloaded' is sufficient and
      // matches this Puppeteer version's typed waitUntil values.
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate:
          '<div style="font-size:9px;width:100%;text-align:center;color:#999;">BeaconVie · Trang <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
        margin: { top: '20mm', bottom: '16mm', left: '16mm', right: '16mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  checksum(buffer: Buffer): Promise<string> {
    return Promise.resolve(createHash('sha256').update(buffer).digest('hex'));
  }
}
