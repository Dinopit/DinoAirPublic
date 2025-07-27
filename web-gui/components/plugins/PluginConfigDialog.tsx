'use client';

import React, { useState, useEffect } from 'react';

export interface ConfigField {
  key: string;
  type:
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'multiselect'
    | 'textarea'
    | 'url'
    | 'email'
    | 'password';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  group?: string;
  dependsOn?: string;
  showIf?: (config: any) => boolean;
}

export interface ConfigSchema {
  title: string;
  description?: string;
  fields: ConfigField[];
  groups?: { [key: string]: { title: string; description?: string } };
}

interface PluginConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pluginId: string;
  pluginName: string;
  schema: ConfigSchema;
  currentConfig: any;
  onSave: (config: any) => Promise<void>;
}

export function PluginConfigDialog({
  isOpen,
  onClose,
  pluginId,
  pluginName,
  schema,
  currentConfig,
  onSave,
}: PluginConfigDialogProps) {
  const [config, setConfig] = useState(currentConfig || {});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(currentConfig || {});
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, currentConfig]);

  const updateField = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setIsDirty(true);

    // Clear error for this field
    if (errors[key]) {
      setErrors({ ...errors, [key]: '' });
    }

    // Validate field
    const field = schema.fields.find((f) => f.key === key);
    if (field) {
      const error = validateField(field, value, newConfig);
      if (error) {
        setErrors({ ...errors, [key]: error });
      }
    }
  };

  const validateField = (field: ConfigField, value: any, fullConfig: any): string | null => {
    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} is required`;
    }

    // Skip validation if field is empty and not required
    if (!field.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Type validation
    switch (field.type) {
      case 'number':
        if (isNaN(Number(value))) {
          return `${field.label} must be a number`;
        }
        if (field.validation?.min !== undefined && Number(value) < field.validation.min) {
          return `${field.label} must be at least ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && Number(value) > field.validation.max) {
          return `${field.label} must be at most ${field.validation.max}`;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${field.label} must be a valid email address`;
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return `${field.label} must be a valid URL`;
        }
        break;

      case 'text':
      case 'textarea':
      case 'password':
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            return field.validation.message || `${field.label} format is invalid`;
          }
        }
        if (field.validation?.min !== undefined && value.length < field.validation.min) {
          return `${field.label} must be at least ${field.validation.min} characters`;
        }
        if (field.validation?.max !== undefined && value.length > field.validation.max) {
          return `${field.label} must be at most ${field.validation.max} characters`;
        }
        break;
    }

    return null;
  };

  const validateAll = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    for (const field of schema.fields) {
      // Skip fields that are conditionally hidden
      if (field.showIf && !field.showIf(config)) {
        continue;
      }

      const error = validateField(field, config[field.key], config);
      if (error) {
        newErrors[field.key] = error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateAll()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(config);
      setIsDirty(false);
      onClose();
    } catch (error) {
      console.error('Failed to save plugin config:', error);
      // Show error notification
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: ConfigField) => {
    // Check if field should be shown
    if (field.showIf && !field.showIf(config)) {
      return null;
    }

    const value = config[field.key] ?? field.defaultValue ?? '';
    const hasError = !!errors[field.key];

    const baseClasses = `
      w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
      ${hasError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
    `;

    let input;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'password':
        input = (
          <input
            type={field.type}
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            className={baseClasses}
            placeholder={field.description}
          />
        );
        break;

      case 'number':
        input = (
          <input
            type="number"
            value={value}
            onChange={(e) => updateField(field.key, Number(e.target.value))}
            className={baseClasses}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );
        break;

      case 'boolean':
        input = (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => updateField(field.key, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">{field.description}</span>
          </label>
        );
        break;

      case 'select':
        input = (
          <select
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            className={baseClasses}
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        break;

      case 'multiselect':
        input = (
          <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2">
            {field.options?.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const currentValue = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      updateField(field.key, [...currentValue, option.value]);
                    } else {
                      updateField(
                        field.key,
                        currentValue.filter((v) => v !== option.value)
                      );
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );
        break;

      case 'textarea':
        input = (
          <textarea
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            className={`${baseClasses} h-24 resize-vertical`}
            placeholder={field.description}
          />
        );
        break;

      default:
        input = (
          <input
            type="text"
            value={value}
            onChange={(e) => updateField(field.key, e.target.value)}
            className={baseClasses}
          />
        );
    }

    return (
      <div key={field.key} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {input}
        {field.description && field.type !== 'boolean' && (
          <p className="text-xs text-gray-500">{field.description}</p>
        )}
        {hasError && <p className="text-xs text-red-600">{errors[field.key]}</p>}
      </div>
    );
  };

  const groupedFields = schema.fields.reduce(
    (groups, field) => {
      const groupKey = field.group || 'default';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(field);
      return groups;
    },
    {} as { [key: string]: ConfigField[] }
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Configure {pluginName}</h2>
              <p className="text-sm text-gray-500 mt-1">{schema.description}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] px-6 py-4">
          <div className="space-y-6">
            {Object.entries(groupedFields).map(([groupKey, fields]) => (
              <div key={groupKey}>
                {groupKey !== 'default' && schema.groups?.[groupKey] && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {schema.groups[groupKey].title}
                    </h3>
                    {schema.groups[groupKey].description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {schema.groups[groupKey].description}
                      </p>
                    )}
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">{fields.map(renderField)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {isDirty && <span className="text-orange-600">⚠️ You have unsaved changes</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(errors).length > 0}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors flex items-center gap-2"
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
