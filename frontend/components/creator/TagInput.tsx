'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

interface TagInputProps {
  label: string;
  placeholder: string;
  values: string[];
  maxItems?: number;
  lowerCase?: boolean;
  onChange: (values: string[]) => void;
}

export default function TagInput({
  label,
  placeholder,
  values,
  onChange,
  maxItems = 10,
  lowerCase = false,
}: TagInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');

  const addValue = (): void => {
    const nextValue = lowerCase ? inputValue.trim().toLowerCase() : inputValue.trim();

    if (!nextValue || values.includes(nextValue) || values.length >= maxItems) {
      return;
    }

    onChange([...values, nextValue]);
    setInputValue('');
  };

  return (
    <div>
      <label className="mb-1 block text-sm text-text-secondary">{label}</label>
      <div className="rounded-2xl border border-border bg-bg-card p-3">
        <div className="mb-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={value} className="inline-flex items-center gap-1 rounded-full border border-accent-gold/60 bg-accent-gold/10 px-3 py-1 text-xs text-text-primary">
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="text-text-secondary hover:text-text-primary"
                aria-label={`Remove ${value}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addValue();
            }
          }}
          onBlur={addValue}
          placeholder={values.length >= maxItems ? `Limit reached (${maxItems})` : placeholder}
          className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          disabled={values.length >= maxItems}
        />
      </div>
    </div>
  );
}
