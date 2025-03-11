import React, { FC, useState, useEffect } from 'react';
import { Input, FormMessage, FormGroup, Select } from '@adminjs/design-system';
import { EditPropertyProps, PropertyLabel, useTranslation } from 'adminjs';

type CombinedProps = EditPropertyProps;

const EditProperty: FC<CombinedProps> = (props) => {
  const { property, record } = props;
  const error = record.errors?.[property.path];
  const { tm } = useTranslation();

  if (property.custom.providers) {
    if (!property.custom.providers.includes(record.params.provider)) {
      return null;
    }
  }
  return (
    <FormGroup error={Boolean(error)}>
      <PropertyLabel property={property} />
      {property.custom.availableValues ? <SelectEdit {...props} /> : <TextEdit {...props} />}
      <FormMessage>{error && tm(error.message, property.resourceId)}</FormMessage>
    </FormGroup>
  );
};

const SelectEdit: FC<CombinedProps> = (props) => {
  const { record, property, onChange } = props;
  const { tl } = useTranslation();
  if (!property.custom.availableValues) {
    return null;
  }

  const propValue = record.params?.[property.path] ?? property.props.value ?? '';
  const availableValues = property.custom.availableValues
    .filter((v) => {
      return record.params.provider?.toLowerCase() === v.label?.toLowerCase();
    })
    .map((v) => ({
      ...v,
      label: tl(`${property.path}.${v.value}`, property.resourceId, { defaultValue: v.value }),
    }));
  const selected = availableValues.find((av) => av.value == propValue);

  return (
    <Select
      value={selected}
      options={availableValues}
      onChange={(s) => onChange(property.path, s?.value ?? '')}
      isDisabled={property.isDisabled}
      {...property.props}
    />
  );
};

const TextEdit: FC<CombinedProps> = (props) => {
  const { property, record, onChange } = props;
  const propValue = record.params?.[property.path] ?? property.props.value ?? '';
  const [value, setValue] = useState(propValue);

  useEffect(() => {
    if (value !== propValue) {
      setValue(propValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propValue]);

  return (
    <Input
      id={property.path}
      name={property.path}
      required={property.isRequired}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onChange(property.path, value)}
      // handle clicking ENTER
      onKeyDown={(e) => e.keyCode === 13 && onChange(property.path, value)}
      value={value}
      disabled={property.isDisabled}
      {...property.props}
    />
  );
};

export default EditProperty;
