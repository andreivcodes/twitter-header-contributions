var puppeteer = require("puppeteer");
const { createCanvas, loadImage } = require("canvas");
var fs = require("fs");
var sharp = require("sharp");
const TwitterV1 = require("twitter");
require("dotenv").config();

const credentials = {
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
};

const clientV1 = new TwitterV1(credentials);

const GITHUB_USERNAME = "andreivdev";

const GITHUB_CONTRIBUTION_SELECTOR =
  "#js-pjax-container > div.container-xl.px-3.px-md-4.px-lg-5 > div > div.Layout-main > div:nth-child(2) > div > div.mt-4.position-relative > div > div.col-12.col-lg-10 > div.js-yearly-contributions > div:nth-child(1) > div > div";

const REMOVE_SELECTOR =
  "#js-pjax-container > div.container-xl.px-3.px-md-4.px-lg-5 > div > div.Layout-main > div:nth-child(2) > div > div.mt-4.position-relative > div > div.col-12.col-lg-10 > div.js-yearly-contributions > div:nth-child(1) > div > div > div > div.float-left";

const CONTRIBUTION_SELECTOR =
  "#js-pjax-container > div.container-xl.px-3.px-md-4.px-lg-5 > div > div.Layout-main > div:nth-child(2) > div > div.mt-4.position-relative > div > div.col-12.col-lg-10 > div.js-yearly-contributions > div:nth-child(1) > h2";

const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 2400, height: 1920 });

  console.log("go to page");

  await page.goto(`https://github.com/${GITHUB_USERNAME}`);

  console.log("get dark mode");
  // Dark Mode
  await page.emulateMediaFeatures([
    {
      name: "prefers-color-scheme",
      value: "dark",
    },
  ]);

  console.log("get selector");
  await page.waitForSelector(GITHUB_CONTRIBUTION_SELECTOR);

  // puppeteer hide the selected element
  await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    element.style.display = "none";
  }, REMOVE_SELECTOR);

  await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    element.style.margin = "8px";
    element.style.paddingTop = "16px";
  }, CONTRIBUTION_SELECTOR);

  const element = await page.$(GITHUB_CONTRIBUTION_SELECTOR);
  if (element) {
    await element.screenshot({ path: "contributions.png" });
  }

  await browser.close();

  console.log("Done creating the screenshot");

  console.log("Done editing the screenshot");

  const base64 = await addTextToImage(__dirname + `/../contributions.png`);
  console.log("Done editing the screenshot!");

  clientV1.post(
    "account/update_profile_banner",
    {
      banner: base64.toString("base64"),
    },
    (err, _data, response) => {
      console.log("err", err);
      const json = response.toJSON();
      console.log(json.statusCode, json.headers, json.body);
    }
  );
};

const addTextToImage = async (filename) => {
  const beforeResize = await loadImage(filename);
  const toResizeWidth = 1000; //beforeResize.width + 100;
  const toResizeHeight = beforeResize.height + 10;
  const roundedCorners = Buffer.from(
    `<svg><rect x="0" y="0" width="${toResizeWidth}" height="${toResizeHeight}" rx="16" ry="16"/></svg>`
  );
  await sharp(filename)
    .resize(toResizeWidth, toResizeHeight)
    .composite([
      {
        input: roundedCorners,
        blend: "dest-in",
      },
    ])
    .toFile(__dirname + `/../rounded_corner.png`);

  const img = await loadImage(__dirname + `/../rounded_corner.png`);
  const canvas = createCanvas(1000, 420);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgb(15, 16, 24)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(img, 5, 100);

  return canvas.toBuffer();
};

main();
setInterval(() => {
  main();
}, 1000 * 60 * 10);
