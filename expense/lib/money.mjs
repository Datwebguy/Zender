export function zats(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)(\.\d{1,8})?$/.test(value)) throw new Error('Enter a positive ZEC amount with up to 8 decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const amount = BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, '0'));
  if (amount <= 0n || amount > 21000000n * 100000000n) throw new Error('Amount is outside the supported range.');
  return Number(amount);
}
export function zec(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid zatoshi value.');
  return `${Math.floor(value / 1e8)}.${String(value % 1e8).padStart(8, '0')}`;
}
export function integer(value, name = 'amount') {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${name}.`);
  return value;
}
