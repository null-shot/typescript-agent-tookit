// Simple test following official Cloudflare docs exactly
import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    const { searchParams } = new URL(request.url);
    let url = searchParams.get("url");

    if (url) {
      url = new URL(url).toString(); // normalize
      const browser = await puppeteer.launch(env.MYBROWSER);
      const page = await browser.newPage();
      await page.goto(url);
      const img = await page.screenshot();
      await browser.close();

      return new Response(img, {
        headers: {
          "content-type": "image/jpeg",
        },
      });
    } else {
      return new Response("Please add an ?url=https://example.com/ parameter");
    }
  },
};
