import { z } from 'zod';

export const uuidSchema = z.uuid();

/**
 * Money crosses the wire as an integer-paise decimal string. JSON has no
 * integer wide enough to be safe here, and a float would reintroduce the
 * rounding error the ledger exists to avoid. Clients parse with BigInt.
 */
export const paiseSchema = z
  .string()
  .regex(/^-?\d{1,19}$/, 'Expected an integer paise amount as a string');

export type PaiseString = z.infer<typeof paiseSchema>;

export function toPaiseString(amount: bigint): PaiseString {
  return amount.toString();
}

export function fromPaiseString(amount: PaiseString): bigint {
  return BigInt(amount);
}

/** Calendar date with no time or zone — activity dates, harvest dates. */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const timestampSchema = z.iso.datetime({ offset: true });

export const projectCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}[A-Z]{2}\d{2,3}$/, 'Expected a project code like MYSBN06');

export const mobileSchema = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, 'Expected an Indian mobile in +91XXXXXXXXXX form');

export const basisPointsSchema = z.number().int().min(0).max(10_000);

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function pageOf<T extends z.ZodType>(
  entry: T,
): z.ZodObject<{ items: z.ZodArray<T>; nextCursor: z.ZodNullable<z.ZodString> }> {
  return z.object({
    items: z.array(entry),
    nextCursor: z.string().nullable(),
  });
}

export const okSchema = z.object({ ok: z.literal(true) });
