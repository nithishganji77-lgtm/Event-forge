import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';
import { registerUser } from '../services/auth.service.js';

const RESET = process.argv.includes('--reset');
const FORCE = process.argv.includes('--force');

const DEMO_PASSWORD = 'Demo@1234';

// Phase 1 seed: just enough to verify auth end-to-end. Organizations/members/events/registrations
// are added here in Phase 2/3, once those models have real routes behind them.
const DEMO_USERS = [{ name: 'Ava Sharma', email: 'ava@eventforge.dev' }];

async function seed() {
  if (config.NODE_ENV === 'production' && !FORCE) {
    logger.error('Refusing to seed a production database without --force');
    process.exit(1);
  }

  await connectDB();

  if (RESET) {
    await User.deleteMany({});
    logger.info('Cleared existing users');
  }

  const created = [];
  for (const demo of DEMO_USERS) {
    const existing = await User.findOne({ email: demo.email });
    if (existing) {
      created.push(existing);
      continue;
    }
    const user = await registerUser({ ...demo, password: DEMO_PASSWORD });
    created.push(user);
  }

  logger.info('Seed complete');
  console.log('\nDemo credentials:');
  for (const user of created) {
    console.log(`  ${user.email}  /  ${DEMO_PASSWORD}`);
  }
  console.log('');

  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
