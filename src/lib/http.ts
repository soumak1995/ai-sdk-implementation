export type ParsedJson<T> = { success: true; data: T } | { success: false; data: null };

/**
 * Safely parses JSON body from a Request and validates with a narrow function.
 * Returns a discriminated union with success flag.
 */
export async function parseJsonBody<T>(
  request: Request,
  narrow: (value: unknown) => value is T
): Promise<ParsedJson<T>> {
  try {
    const json = await request.json();
    if (narrow(json)) {
      return { success: true, data: json };
    }
    return { success: false, data: null };
  } catch {
    return { success: false, data: null };
  }
}


