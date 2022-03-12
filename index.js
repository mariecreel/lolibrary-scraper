const puppeteer = require('puppeteer');
const url = 'https://lolibrary.org/search';
const filters = {};
const filterNameSelector = 'label.control-label';
const filterComboboxSelector = '.v-select > vs__dropdown-toggle';

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    let i;
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
