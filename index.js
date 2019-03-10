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
      await d.get('https://www.instagram.com/javascript.js/?hl=en');
      const writes = [];

      for await (const sources of async function*() {
        while (true) {
          const images = await d.findElements(By.css('article > div > div img'));

          if (images.length) {
            const sources = await Promise.all(images.map(image => image.getAttribute('src')));
            await d.executeScript('window.scrollTo(0,document.body.scrollHeight);');
            await d.executeScript(sources.map(source => {
              return `document.querySelector('[src="${source}"]').remove()`;
            }).join(';'));

            let attempts = 0;
            await d.wait(() => {
              return d.findElements(By.css('article > div > div img'))
                .then(elements => {
                  attempts++;
                  return (elements.length > 0) || (attempts === 200);
                });
            });
            yield(sources);
          } else {
            break;
          }
        }
      }()) {
        sources.forEach(source => {
          writes.push(new Promise((resolve, reject) => {
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
          }));
        });
      }
      await Promise.all(writes);
    } catch (err) {
      console.log(err);
    } finally {
      await d.quit();
    }
  });
