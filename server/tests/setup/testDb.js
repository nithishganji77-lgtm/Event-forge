import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod;

// Per-test-file, not a globalSetup-shared singleton: globalSetup/globalTeardown run in a separate
// process from the test files themselves, so a `mongod` handle created there wouldn't survive into
// teardown without extra IPC plumbing. Each file paying ~1s to start its own ephemeral mongod is a
// fine tradeoff at 7 files, and keeps every suite's DB state fully isolated from every other's.
export async function connectTestDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function clearTestDb() {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}
