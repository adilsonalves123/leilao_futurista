import { validateDimensions, validateWeight } from '@/src/lib/dimensionsValidation';
import { validateNfAccessKey } from '@/src/lib/nfValidation';
import type { ComplianceResult, ListingDraft } from '@/src/types/operations';

export function validateListingDraft(draft: ListingDraft): ComplianceResult {
  const errors: string[] = [];

  if (!draft.title?.trim()) errors.push('Informe o título do leilão.');
  if (!draft.priceCents || draft.priceCents <= 0) errors.push('Informe um preço válido.');

  const weightError = validateWeight(draft.weightKg);
  if (weightError) errors.push(weightError);

  errors.push(...validateDimensions(draft.dimensions));

  const hasPdf = Boolean(draft.nfPdfUri?.trim());
  const keyError = validateNfAccessKey(draft.nfAccessKey);

  if (!hasPdf && keyError) {
    errors.push(keyError);
    errors.push('Ou faça upload do PDF da NF-e.');
  }

  return { ok: errors.length === 0, errors };
}
