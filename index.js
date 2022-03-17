const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

(async () => {
    const url = 'https://lolibrary.org/search';
    const filters = {};
    const filterNameSelector = 'label.control-label';
    const filterComboboxSelector = '.v-select > vs__dropdown-toggle';
    let i;
    // avoid headless crawler detection
    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto(url);
    // get the filter names
    const filterHandle = await page
        .waitForSelector(filterNameSelector)
        .then(() => {
            return page.$$(filterNameSelector);
        });
    // set up the filter map
    for (i = 0; i < filterHandle.length; i++) {
        header = await filterHandle[i].evaluate((node) => node.innerText);
        filters[header.toLowerCase()] = [];
    }
})();
