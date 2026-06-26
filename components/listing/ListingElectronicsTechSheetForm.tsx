import { useMemo } from 'react';

import { ListingTechSheetForm } from '@/components/listing/ListingTechSheetForm';
import type { ElectronicTypeId } from '@/src/constants/electronicsCatalog';
import {
  getTechSheetFields,
  getVisibleTechSheetFields,
  type ElectronicsTechSheetValues,
} from '@/src/constants/electronicsTechSheet';

type Props = {
  typeId: ElectronicTypeId;
  values: ElectronicsTechSheetValues;
  onChange: (next: ElectronicsTechSheetValues) => void;
  showErrors?: boolean;
};

export function ListingElectronicsTechSheetForm({
  typeId,
  values,
  onChange,
  showErrors = false,
}: Props) {
  const fields = useMemo(() => getVisibleTechSheetFields(typeId, values), [typeId, values]);

  function handleChange(next: ElectronicsTechSheetValues) {
    if (typeId === 'celular' && next.marca !== values.marca) {
      const m = (next.marca ?? '').trim().toLowerCase();
      if (m !== 'apple' && !m.includes('iphone')) {
        const copy = { ...next };
        delete copy.saude_bateria;
        onChange(copy);
        return;
      }
    }
    onChange(next);
  }

  return (
    <ListingTechSheetForm
      fields={fields}
      values={values}
      onChange={handleChange}
      showErrors={showErrors}
      intro="Ficha técnica obrigatória — o comprador verá esses dados na página do leilão, sem precisar perguntar no chat."
    />
  );
}
