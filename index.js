require('chromedriver');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { Builder, By } = require('selenium-webdriver');

if (!fs.existsSync('out')) {
  fs.mkdirSync('out');
}

let i = 1000;

new Builder()
  .forBrowser('chrome')
  .build()
  .then(async d => {
    try {
      await d.get('https://www.instagram.com/tjdavenport2/?hl=en');
      const images = await d.findElements(By.css('article > div > div img'));
      const sources = await Promise.all(images.map(image => image.getAttribute('src')));
      await Promise.all(sources.map(source => {
        return new Promise((resolve, reject) => {
          const writer = fs.createWriteStream(path.join('out', `${i++}.jpg`));

          writer.on('error', err => {
            reject(err);
          });

          https.get(source, res => {
            writer.on('finish', () => {
              writer.close(resolve);
            });

            res.pipe(writer);
          }).on('error', err => {
            reject(err);
          });
        });
      }));
    } catch (err) {
      console.log(err);
    } finally {
      await d.quit();
    }
  });
