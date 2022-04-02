const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

(async () => {
  const url = "https://lolibrary.org/search";
  const filters = {};
  const filterNameSelector = "label.control-label";
  const filterComboboxSelector = ".v-select > .vs__dropdown-toggle";
  let i;
  // avoid headless crawler detection
  puppeteer.use(StealthPlugin());
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url);
  // get the filter names
  const filtersHandle = await page
    .waitForSelector(filterNameSelector)
    .then(() => {
      return page.$$(filterNameSelector);
    });
  // set up the filter map
  for (i = 0; i < filtersHandle.length; i++) {
    const header = await filtersHandle[i].evaluate((node) => node.innerText);
    const listboxId = await filtersHandle[i].evaluate((node) => {
      const sibling = node.nextElementSibling;
      const id = sibling.children[1].id;
      return id;
    });
    filters[header.toLowerCase()] = { values: [], listboxId: listboxId };
  }
  // interact with the filter comboboxes to get filter values
  const filterComboboxesHandle = await page
    .waitForSelector(filterComboboxSelector)
    .then(() => {
      return page.$$(filterComboboxSelector);
    });
  for (i = 0; i < filterComboboxesHandle.length; i++) {
    const ariaOwns = await filterComboboxesHandle[i].evaluate(
      (node) => node.attributes["aria-owns"].nodeValue
    );
    // focus on the input
    await page.waitForSelector(`input[aria-controls='${ariaOwns}']`);
    await page.click(`input[aria-controls='${ariaOwns}']`);
    let filterName = "";
    for (const key of Object.keys(filters)) {
      if (filters[key].listboxId === ariaOwns) {
        filterName = key;
        break;
      }
    }
    const filterListboxHandle = await page
      .waitForSelector(`#${ariaOwns}`, { visible: true })
      .then(() => {
        return page.$(`#${ariaOwns}`);
      });
    const filterValues = await filterListboxHandle.evaluate((node) => {
      let values = [];
      for (const child of node.children) {
        values.push(child.textContent.trim());
      }
      return values;
    });
    filters[filterName].values = filterValues;
    // click another element to clear browser focus.
    // if we don't do this, the focus will be stuck in the first input,
    // so the second listbox will never show when we click it.
    await page.click(".card-header");
  }
  // TODO: send filters to postgreSQL database...need an endpoint for this?
})();
