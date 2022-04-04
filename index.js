const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require('axios');
require('dotenv').config();

(async () => {
  const url = "https://lolibrary.org/search";
  const filters = {};
  const filterNameSelector = ".input-group > label.control-label";
  const filterComboboxSelector =
    ".v-select > .vs__dropdown-toggle[role='combobox']";
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
      // the next sibling should be the div that contains 
      // both the listbox and the combobox
      const sibling = node.nextElementSibling;
      // the listbox appears after the combobox (should not be nested within)
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
      // compare the ariaOwns attribute with the listbox ID we collected earlier
      // and get the correct filter key so we can push the values
      // to the right array...
      if (filters[key].listboxId === ariaOwns) {
        filterName = key;
        break;
      }
    }
    // now that the listbox is visible, we can scrape the values!
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
  await browser.close();
  // clean data to send to api
  // we don't need to store the listbox id in the db,
  // so just send the key/value pairs of 
  // filter type and value
  let postData = {};
  for (const key of Object.keys(filters)) {
    postData[key] = filters[key].values;
  }
  // create function to post data to lolibrary API for import
  // using a closure makes sense, given that this function will be passed as a cb to requestApiToken
  const postFilterDataToApi = (token) => {
    const options = {
      method: 'POST',
      url: process.env.IMPORT_URL,
      headers: { 
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(postData),
    }

    axios(options).then((res) => {
      console.log(res)
    }).catch(err => {
      throw new Error(err)
    })
  }
  // request fresh API token and post data
  requestApiToken(postFilterDataToApi)
})();
// get API token and pass to callback fxn
const requestApiToken = (callback) => {
  const options = {
    method: 'POST',
    url: process.env.AUTH0_API_URL,
    headers: { 'content-type': 'application/json'},
    body: JSON.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
      grant_type: "client_credentials"
    })
  }
  console.log(options)
  axios(options).then(res => {
    if (res["access_token"]) {
      callback(res["access_token"])
    } else {
      throw new Error('no access token granted')
    }
  }).catch(err => {
    throw new Error(err)
  })
};
