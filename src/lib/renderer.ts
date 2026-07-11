import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

/**
 * Renders a page using a headless browser and returns the fully rendered HTML + response headers.
 * Falls back to simple fetch if headless browser is unavailable.
 */
export async function renderPage(url: string): Promise<{
  html: string;
  headers: Record<string, string>;
  method: "browser" | "fetch";
}> {
  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    let responseHeaders: Record<string, string> = {};
    page.on("response", (response) => {
      if (response.url() === url || response.url() === url + "/") {
        const headers = response.headers();
        responseHeaders = Object.fromEntries(
          Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
        );
      }
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    await new Promise((r) => setTimeout(r, 1000));

    const html = await page.content();
    await browser.close();

    return { html, headers: responseHeaders, method: "browser" };
  } catch (error) {
    console.warn("Headless browser unavailable, falling back to fetch:", error);
    return fetchPage(url);
  }
}

/**
 * Simple fetch fallback (no JavaScript rendering)
 */
export async function fetchPage(url: string): Promise<{
  html: string;
  headers: Record<string, string>;
  method: "fetch";
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
    signal: controller.signal,
  });

  clearTimeout(timeout);

  const html = await res.text();
  const headers = Object.fromEntries(
    [...res.headers.entries()].map(([k, v]) => [k.toLowerCase(), v])
  );

  return { html, headers, method: "fetch" };
}
