import React from 'react';
import { formatInputAmount, parseRawNumber } from '../utils/formatters';

/**
 * Custom Amount input that strips decimals, allows only digits,
 * and formats live with spaces as user types (e.g. 100000 -> 100 000).
 */
export default function AmountInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  required = false,
  suffix = 'UZS',
  ...rest
}) {
  const displayValue = value === 0 || value ? formatInputAmount(value) : '';

  const handleChange = (e) => {
    const rawDigits = parseRawNumber(e.target.value);
    onChange(rawDigits);
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={`w-full font-mono ${suffix ? 'pr-12' : ''} ${className}`}
        {...rest}
      />
      {suffix && (
        <span className="absolute right-3.5 text-xs text-on-surface-variant font-mono pointer-events-none select-none font-semibold">
          {suffix}
        </span>
      )}
    </div>
  );
}
