import { ListingTechSheetForm } from '@/components/listing/ListingTechSheetForm';
import { PROPERTY_TECH_SHEET_FIELDS } from '@/src/constants/propertyTechSheet';
import type { PropertyTechSheetValues } from '@/src/constants/propertyTechSheet';

type Props = {
  values: PropertyTechSheetValues;
  onChange: (next: PropertyTechSheetValues) => void;
  showErrors?: boolean;
};

export function ListingPropertyTechSheetForm({ values, onChange, showErrors = false }: Props) {
  return (
    <ListingTechSheetForm
      fields={PROPERTY_TECH_SHEET_FIELDS}
      values={values}
      onChange={onChange}
      showErrors={showErrors}
      intro="Ficha do imóvel obrigatória — ocupação e documentação protegem comprador e plataforma em leilões de alto valor."
    />
  );
}
