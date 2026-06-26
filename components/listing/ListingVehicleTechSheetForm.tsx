import { ListingTechSheetForm } from '@/components/listing/ListingTechSheetForm';
import { VEHICLE_TECH_SHEET_FIELDS } from '@/src/constants/vehicleTechSheet';
import type { VehicleTechSheetValues } from '@/src/constants/vehicleTechSheet';

type Props = {
  values: VehicleTechSheetValues;
  onChange: (next: VehicleTechSheetValues) => void;
  showErrors?: boolean;
};

export function ListingVehicleTechSheetForm({ values, onChange, showErrors = false }: Props) {
  return (
    <ListingTechSheetForm
      fields={VEHICLE_TECH_SHEET_FIELDS}
      values={values}
      onChange={onChange}
      showErrors={showErrors}
      intro="Ficha do veículo obrigatória — transparência para compradores. O RENAVAM fica só com a plataforma (não aparece no anúncio)."
    />
  );
}
