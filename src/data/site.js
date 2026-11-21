// Ganti '#' dengan URL sebenarnya (lihat bagian "Perlu Dikonfirmasi" di dokumentasi copywriting).
export const links = { dashboard: '#', telegram: '#', github: '#', health: '#', hivemind: '#', terms: '#', privacy: '#', risk: '#' };
export const nav = [['Features', 'features'], ['How it works', 'how-it-works'], ['Protection', 'protection'], ['Dashboard', 'dashboard'], ['FAQ', 'faq']];
export const heroChips = ['Portfolio Management', 'Automated Strategies', 'Wallet & Capital Monitoring', 'Profit & Saving Tracking'];
export const trust = [{ n: 24, s: '/7', l: 'monitoring' }, { n: 5, s: '-min', l: 'manage cycle' }, { n: 4, s: '', l: 'purpose-built wallets' }, { n: 4, s: '-step', l: 'decision pipeline' }];
export const meridianPoints = ['Customizable pool screening', 'Live PnL and range monitoring', 'Built-in take profit, stop loss, and trailing stop', 'Out-of-range exit and repeat-deploy cooldown'];
export const flow = ['Screening', 'HiveMind', 'Risk Engine', 'Execution'];
export const steps = [
  ['Screen', 'Scans pools against your thresholds: fee-to-TVL, organic score, holders, market cap, volume.'],
  ['Validate', 'HiveMind adds AI-assisted validation to each candidate.'],
  ['Check', 'The Risk Engine verifies capacity, balance, gas reserve, and cooldown.'],
  ['Deploy', 'Opens a position within your per-position limits.'],
  ['Manage', 'Watches PnL and range every few minutes. Takes profit, cuts losses, exits when out of range too long.'],
  ['Learn', 'Records each outcome so the next cycle starts informed.'],
];
export const risks = ['Take profit and stop loss per position', 'Trailing stop', 'Out-of-range timeout', 'Gas reserve and minimum balance to open', 'Position size and capacity limits', 'Repeat-deploy cooldown', 'Safety checks before every execution'];
export const wallets = [['Treasury', 'Where capital enters ARIA.'], ['Bot', 'Used by Meridian for live DLMM execution.'], ['Main', 'Receives realized profit and handles operations.'], ['Emergency', 'A safety reserve, isolated from normal bot operations.']];
export const views = [
  ['Overview', 'Portfolio value, PnL, win rate, and runtime status at a glance.'],
  ['Meridian', 'Strategy, runtime, and screening settings of the live agent.'],
  ['Wallets', 'Balances and allocation across all four wallets.'],
  ['Positions', 'What is open now, and every position closed before it.'],
  ['Performance', 'Cumulative PnL curve, best and worst trades, range efficiency.'],
  ['Candidates', 'Every pool Meridian evaluated, and why it passed or failed.'],
  ['HiveMind', 'AI validation status and the decision pipeline.'],
  ['Activity', 'A timestamped log of what the agent did and when.'],
  ['Risk Control', 'Limits, protection rules, and pre-execution safety checks.'],
  ['Configuration', 'Every parameter the agent is running on.'],
  ['Settings', 'Health of runtime, API, RPC, AI provider, and integrations.'],
];
export const faq = [
  ['What is ARIA?', 'An autonomous platform for Solana DLMM liquidity. Its engine, Meridian, screens pools, manages positions, and logs decisions while you keep visibility.'],
  ['Does ARIA hold my funds?', 'ARIA is designed so you act from your own wallet. Login wallets are for authentication only.'],
  ['Can I lose money?', 'Yes. DLMM carries market risk, impermanent loss, and token risk. ARIA adds protections but cannot guarantee results.'],
  ['What does the AI do?', 'HiveMind adds validation and context before entry. Hard risk rules apply regardless.'],
  ['Can I edit risk settings?', 'Not yet. They are read-only until authentication, audit, and confirmation layers are built.'],
  ['Can I test first?', 'Yes, Meridian supports dry-run simulation.'],
  ['Which network?', 'Solana mainnet, on Meteora DLMM pools.'],
  ['How do I get access?', 'ARIA is in beta. Join Telegram or request access from the login page.'],
];
export const physChips = [...heroChips, 'Meridian', 'HiveMind', 'Risk Engine', 'Solana DLMM'];
