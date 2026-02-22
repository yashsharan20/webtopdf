const express = require("express");
const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

async function preparePage(page, url) {
  await page.setViewport({
    width: 1280,
    height: 2000,
    deviceScaleFactor: 2,
  });

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  await page.emulateMediaType("screen");
  await autoScroll(page);
}

app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Website to PDF AI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;500;700&display=swap" rel="stylesheet">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Poppins', sans-serif;
      }

      body {
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: radial-gradient(circle at 20% 30%, #4f46e5, transparent 40%),
                    radial-gradient(circle at 80% 70%, #9333ea, transparent 40%),
                    #0f172a;
        overflow: hidden;
      }

      .glass-card {
        width: 420px;
        padding: 40px;
        border-radius: 20px;
        background: rgba(255,255,255,0.08);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.15);
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        text-align: center;
        color: white;
        animation: fadeIn 1s ease-in-out;
      }

      h1 {
        font-weight: 700;
        margin-bottom: 10px;
        font-size: 26px;
        background:white;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      p {
        font-size: 14px;
        color: #cbd5e1;
        margin-bottom: 25px;
      }

      input {
        width: 100%;
        padding: 14px;
        border-radius: 12px;
        border: none;
        outline: none;
        margin-bottom: 15px;
        background: rgba(255,255,255,0.15);
        color: white;
        font-size: 14px;
      }

      input::placeholder {
        color: #cbd5e1;
      }

      button {
        width: 100%;
        padding: 14px;
        border-radius: 12px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: 0.3s ease;
        margin-bottom: 12px;
      }

      .free {
        background: linear-gradient(90deg,#22c55e,#16a34a);
        color: white;
      }

      .pro {
        background: linear-gradient(90deg,#f59e0b,#ef4444);
        color: white;
      }

      button:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      }

      .note {
        font-size: 12px;
        color: #94a3b8;
        margin-top: 10px;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .glow {
        position: absolute;
        width: 300px;
        height: 300px;
        background: #6366f1;
        filter: blur(150px);
        opacity: 0.3;
        animation: float 6s ease-in-out infinite alternate;
      }

      .glow:nth-child(1) { top: 10%; left: 15%; }
      .glow:nth-child(2) { bottom: 10%; right: 15%; }

      @keyframes float {
        from { transform: translateY(-20px); }
        to { transform: translateY(20px); }
      }
    </style>
  </head>
  <body>

    <div class="glow"></div>
    <div class="glow"></div>

    <div class="glass-card">
      <h1>Website → PDF AI</h1>
      <p>Convert any public website into a clean PDF instantly.</p>

      <form method="POST" action="/free">
        <input name="url" placeholder="https://example.com" required />
        <button class="free">Free Plan (1 Page)</button>
      </form>

      <form method="POST" action="/pro">
        <input name="url" placeholder="https://example.com" required />
        <button class="pro">Pro Plan (Multi Page)</button>
      </form>

      <div class="note">
        🚀 Free: Single Page<br/>
        ⚡ Pro: Up to 10 Internal Pages
      </div>
    </div>

  </body>
  </html>
  `);
});

app.post("/free", async (req, res) => {
  let browser;
  try {
    let { url } = req.body;
    if (!url.startsWith("http")) url = "https://" + url;

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await preparePage(page, url);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=single-page.pdf",
    });

    res.send(pdf);

  } catch (error) {
    console.error("FREE ERROR:", error);
    res.status(500).send(error.message);
  } finally {
    if (browser) await browser.close();
  }
});

app.post("/pro", async (req, res) => {
  let browser;
  try {
    let { url } = req.body;
    if (!url.startsWith("http")) url = "https://" + url;

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await preparePage(page, url);

    const baseDomain = new URL(url).origin;

    let links = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a"))
        .map(a => a.href.split("#")[0]) // remove hash
        .filter(href => href)
    );

    // Remove duplicates + only internal links
    links = [...new Set(links)]
      .filter(link => link.startsWith(baseDomain))
      .filter(link => link !== url) // prevent same page
      .slice(0, 9);

    // Always include homepage first
    links.unshift(url);

    const pdfDoc = await PDFDocument.create();

    for (let link of links) {
      const newPage = await browser.newPage();
      await preparePage(newPage, link);

      const pdfBytes = await newPage.pdf({
        format: "A4",
        printBackground: true,
      });

      const tempPdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await pdfDoc.copyPages(
        tempPdf,
        tempPdf.getPageIndices()
      );

      copiedPages.forEach(p => pdfDoc.addPage(p));
      await newPage.close();
    }

    const finalPdf = await pdfDoc.save();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=multi-page.pdf",
    });

    res.send(Buffer.from(finalPdf));

  } catch (error) {
    console.error("PRO ERROR:", error);
    res.status(500).send(error.message);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});