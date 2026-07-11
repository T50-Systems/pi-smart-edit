import { performance } from 'node:perf_hooks';
import { SmartEditSession } from '../src/smart-edit.js';
import type { EditParams, PiClient, ReadParams } from '../src/types.js';

const iterations = 20_000;
const budgetMs = Number(process.env.PI_SMART_EDIT_BENCHMARK_BUDGET_MS ?? 1_000);

const client: PiClient = {
  read: async (_params: ReadParams) => '1#AAAA1111:start\n2#BBBB2222:end',
  edit: async (_params: EditParams) => 'ok',
};
const session = new SmartEditSession(client);

for (let index = 0; index < 1_000; index += 1) {
  await session.replaceUnique('benchmark.txt', 'old', 'new');
}

const started = performance.now();
for (let index = 0; index < iterations; index += 1) {
  await session.replaceUnique('benchmark.txt', 'old', 'new');
}
const durationMs = performance.now() - started;
const microsecondsPerOperation = (durationMs * 1_000) / iterations;

console.log(
  JSON.stringify(
    {
      benchmark: 'replaceUnique policy overhead',
      node: process.version,
      iterations,
      durationMs: Number(durationMs.toFixed(2)),
      microsecondsPerOperation: Number(microsecondsPerOperation.toFixed(2)),
      budgetMs,
      passed: durationMs <= budgetMs,
    },
    null,
    2,
  ),
);

if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
  throw new Error('PI_SMART_EDIT_BENCHMARK_BUDGET_MS must be a positive number');
}
if (durationMs > budgetMs) {
  throw new Error(`Benchmark exceeded ${budgetMs} ms budget: ${durationMs.toFixed(2)} ms`);
}
