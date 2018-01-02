/*
 * Queuing system configuration
 */
const Queue = require('bull');
const lintQueue = new Queue('lint', 'redis://redis:6379');

/*
 * Puppeteer configuration
 */
const fs = require('fs');
const puppeteer = require('puppeteer');
const mdnLinterTestSuite = fs.readFileSync('./mdn-linter.js', 'utf8');

/*
 * Mongo DB ORM configuration
 */
const mongoose = require('mongoose');
mongoose.connect('mongodb://mongo/lint');
mongoose.Promise = global.Promise;

const LintResult = mongoose.model('LintResult', {
    _id: { type: String, required: true, alias: 'uri' },
    results: { type: Array, required: true },
    updated_tms: { type: Date, default: Date.now }
});

/*
 * Linting function
 */
async function lint(uri) {
    const browser = await puppeteer.launch({ devtools: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    const page = await browser.newPage();
    await page.evaluateOnNewDocument(mdnLinterTestSuite);
    await page.goto(`https://developer.mozilla.org/${uri}`);

    const testResults = await page.evaluate(() => {
        let tests = [];
        let rootElement = document.body;

        Object.entries(linter).forEach((element, index) => {
            tests.push({test: element[0], result: linter[element[0]].check(rootElement)});
        });

        return tests;
    });

    await browser.close();
    return testResults;
};

/*
 * Linting queue hook
 */
lintQueue.on('active', function(job) {
    console.log(`Job ${job.data.uri} started`);
});

lintQueue.on('completed', function(job, result) {
    console.log(`Job ${job.data.uri} completed`);
});

/*
 * Linting process starter
 */
lintQueue.process(async (job) => {
    const puppeteerResults = await lint(job.data.uri);

    const lintingResults = new LintResult({
        _id: job.data.uri,
        results: puppeteerResults
    });

    const document = await lintingResults.save().catch((err) => console.error(err));
});

/*
 * Temporary instructions
 */
lintQueue.add({ uri: 'en-US/docs/Web/CSS/position'});
