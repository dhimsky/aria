// DATA DUMMY — nilai ilustrasi saja, bukan performa nyata. Bentuknya mengikuti 11 view dashboard.
// Saat API sudah ada, ganti isi getView() di api.js; struktur { kpis, rows, chart } bisa dipertahankan.
export const dummy = {
  Overview: { kpis: [['Portfolio value', '$12,480'], ['PnL (24h)', '+$84.20'], ['Win rate', '61%'], ['Runtime', 'Running']], chart: true },
  Meridian: { kpis: [['Mode', 'Live'], ['Cycle', '5 min'], ['Strategy', 'Bid-Ask']], rows: [['Min fee-to-TVL', '0.05', 'screen'], ['Min organic score', '70', 'screen'], ['Min holders', '500', 'screen']] },
  Wallets: { kpis: [['Treasury', '$6,200'], ['Bot', '$4,800'], ['Main', '$1,120'], ['Emergency', '$360']] },
  Positions: { kpis: [['Open', '3'], ['Closed', '48']], rows: [['SOL-USDC', 'In range', '+$12.40'], ['JUP-SOL', 'In range', '+$4.10'], ['BONK-SOL', 'Out of range', '-$2.30']] },
  Performance: { kpis: [['Best trade', '+$41.80'], ['Worst trade', '-$18.60'], ['Range efficiency', '74%']], chart: true },
  Candidates: { rows: [['SOL-USDC', 'fee-to-TVL 0.09', 'passed'], ['WIF-SOL', 'organic score 41', 'failed'], ['JUP-SOL', 'HiveMind validated', 'passed'], ['MEW-SOL', 'holders 212', 'failed']] },
  HiveMind: { kpis: [['AI validation', 'Online'], ['Pending', '0']], rows: [['Screening', 'candidates in', 'done'], ['HiveMind', 'context added', 'done'], ['Risk Engine', 'hard rules', 'passed'], ['Execution', 'position opened', 'done']] },
  Activity: { rows: [['09:41:02', 'Screened 38 pools', 'done'], ['09:41:09', 'Validated JUP-SOL', 'done'], ['09:41:11', 'Risk check passed', 'passed'], ['09:41:14', 'Opened position', 'done']] },
  'Risk Control': { rows: [['Take profit', 'per position', 'active'], ['Stop loss', 'per position', 'active'], ['Out-of-range timeout', 'enabled', 'active'], ['Edit limits', 'read-only', 'locked']] },
  Configuration: { rows: [['strategy', 'bid-ask', ''], ['manage_interval', '5 min', ''], ['dry_run', 'false', ''], ['gas_reserve', '0.05 SOL', '']] },
  Settings: { rows: [['Runtime', 'heartbeat 12s ago', 'OK'], ['API', '200 · 84 ms', 'OK'], ['RPC', 'mainnet', 'OK'], ['AI provider', 'no verified source', 'Unavailable']] },
};
