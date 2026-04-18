'use client';

import styles from './InputForm.module.css';

export default function InputForm({ fields, onSubmit, isStreaming, isDisabled }) {
  const defaults = {};
  fields.forEach((f) => {
    if (f.default) defaults[f.id] = f.default;
  });

  function handleSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const values = {};
    for (const [key, val] of formData.entries()) {
      values[key] = val;
    }
    fields.forEach((f) => {
      if (f.type === 'select' && f.default && !values[f.id]) {
        values[f.id] = f.default;
      }
    });
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {fields.map((field) => (
        <div key={field.id} className={styles.field}>
          <label htmlFor={field.id}>{field.label}</label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.id}
              name={field.id}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
              defaultValue={field.default || ''}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.id}
              name={field.id}
              required={field.required}
              defaultValue={field.default || field.options?.[0] || ''}
            >
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              id={field.id}
              name={field.id}
              type="text"
              placeholder={field.placeholder}
              required={field.required}
              defaultValue={field.default || ''}
            />
          )}
        </div>
      ))}
      <button
        type="submit"
        className="btn-primary"
        disabled={isStreaming || isDisabled}
      >
        {isStreaming ? 'Running…' : 'Run Agent'}
      </button>
      {isDisabled && (
        <p className={styles.missingKeys}>
          API keys are missing. <a href="/settings">Configure in Settings</a>.
        </p>
      )}
    </form>
  );
}