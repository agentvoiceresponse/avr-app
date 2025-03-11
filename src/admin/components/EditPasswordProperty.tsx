import React, { useState, useEffect } from 'react';
import { Input, FormGroup, InputGroup, FormMessage, Button, Icon } from '@adminjs/design-system';
import { EditPropertyProps, PropertyLabel, useTranslation } from 'adminjs';

const EditPasswordProperty: React.FC<EditPropertyProps> = (props) => {
  const { property, record, onChange } = props;
  const propValue = record.params?.[property.path] ?? '';
  const [value, setValue] = useState(propValue);
  const error = record.errors && record.errors[property.path];
  const [isInput, setIsInput] = useState(false);
  const { tm } = useTranslation();

  useEffect(() => {
    if (value !== propValue) {
      setValue(propValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propValue]);

  if (property.custom.providers) {
    if (!property.custom.providers.includes(record.params.provider)) {
      return null;
    }
  }

  return (
    <FormGroup error={!!error}>
      <PropertyLabel property={property} />
      {record.params.provider === 'google' ? (
        <Input
          as="textarea"
          rows="10"
          id={property.path}
          name={property.path}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => onChange(property.path, value)}
          value={value}
          disabled={property.isDisabled}
          {...property.props}
        />
      ) : (
        <InputGroup>
          <Input
            type={isInput ? 'input' : 'password'}
            className="input"
            id={property.path}
            name={property.path}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => onChange(property.path, value)}
            onKeyDown={(e) => e.keyCode === 13 && onChange(property.path, value)}
            value={value ?? ''}
            disabled={property.isDisabled}
            {...property.props}
          />
          <Button type="button" size="icon" onClick={() => setIsInput(!isInput)}>
            <Icon icon="Eye" />
          </Button>
        </InputGroup>
      )}
      <FormMessage>{error && tm(error.message, property.resourceId)}</FormMessage>
    </FormGroup>
  );
};

export default EditPasswordProperty;
