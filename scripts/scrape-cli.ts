import { runScraperPipeline } from '../src/lib/server/scraper/pipeline';

// Simple CLI argument parsing
const args = process.argv.slice(2);
let queries: string[] = [];
let outputCsv = 'contacts.csv';
let maxScrolls = 6;
let enrich = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--query' || args[i] === '-q') {
    queries.push(args[i + 1]);
    i++;
  } else if (args[i] === '--output' || args[i] === '-o') {
    outputCsv = args[i + 1];
    i++;
  } else if (args[i] === '--scrolls' || args[i] === '-s') {
    maxScrolls = parseInt(args[i + 1], 10) || 6;
    i++;
  } else if (args[i] === '--no-enrich') {
    enrich = false;
  }
}

if (queries.length === 0) {
  console.log(`
Usage:
  bun run scripts/scrape-cli.ts --query "Zahnarzt 10115 Berlin" [options]

Options:
  --query, -q      Search term for Google Maps (can specify multiple -q flags)
  --output, -o     Output CSV file path (default: "contacts.csv")
  --scrolls, -s    Number of scroll actions per query (default: 6)
  --no-enrich      Skip Stage 2 website email/social enrichment
`);
  process.exit(0);
}

runScraperPipeline({
  queries,
  maxScrolls,
  headless: true,
  enrichWebsites: enrich,
  outputCsvPath: outputCsv
})
  .then((leads) => {
    console.log(`\n🎉 All done! ${leads.length} leads extracted and processed.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal Pipeline Error:', err);
    process.exit(1);
  });
