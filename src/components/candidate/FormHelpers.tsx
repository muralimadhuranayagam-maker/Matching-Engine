// ============================================================
// Shared UI utilities and helper components
// ============================================================

import React, { useState } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import {
  TextField, Select, MenuItem, FormControl, InputLabel,
  FormHelperText, RadioGroup, FormControlLabel, Radio,
  Autocomplete, Chip, Box, Typography, Divider, Paper,
  createFilterOptions
} from "@mui/material";

interface SelectFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options: readonly string[];
  required?: boolean;
  disabled?: boolean;
}

export function SelectField<T extends FieldValues>({
  name, control, label, options, required, disabled
}: SelectFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const val = field.value ?? "";
        const isCustom = val !== "" && !(options as readonly string[]).includes(val);

        return (
          <FormControl fullWidth error={!!fieldState.error} required={required} disabled={disabled}>
            <InputLabel>{label}</InputLabel>
            <Select {...field} label={label} value={val}>
              {isCustom && <MenuItem value={val}>{val}</MenuItem>}
              {options.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
            {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
          </FormControl>
        );
      }}
    />
  );
}

interface TextInputProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  onBlur?: () => void;
  helperText?: string;
  inputProps?: Record<string, unknown>;
  startAdornment?: React.ReactNode;
}

export function TextInput<T extends FieldValues>({
  name, control, label, required, type = "text", placeholder,
  multiline, rows, disabled, onBlur, helperText, inputProps, startAdornment
}: TextInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          disabled={disabled}
          onBlur={() => {
            field.onBlur();
            if (onBlur) onBlur();
          }}
          value={field.value ?? ""}
          label={label}
          fullWidth
          required={required}
          type={type}
          placeholder={placeholder}
          multiline={multiline}
          rows={rows}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          slotProps={{
            htmlInput: inputProps,
            input: startAdornment ? { startAdornment } : undefined,
          }}
        />
      )}
    />
  );
}

interface NumberInputProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
  min?: number;
  startAdornment?: React.ReactNode;
  helperText?: string;
}

export function NumberInput<T extends FieldValues>({
  name, control, label, required, min = 0, startAdornment, helperText
}: NumberInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          fullWidth
          required={required}
          type="number"
          value={field.value ?? ""}
          onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
          onBlur={field.onBlur}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          slotProps={{
            htmlInput: { min },
            input: startAdornment ? { startAdornment } : undefined,
          }}
        />
      )}
    />
  );
}

interface YesNoRadioProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
}

export function YesNoRadio<T extends FieldValues>({ name, control, label, required }: YesNoRadioProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl error={!!fieldState.error} required={required}>
          <Typography variant="caption" color={fieldState.error ? "error" : "text.secondary"} sx={{ mb: 0.5 }}>
            {label}{required && " *"}
          </Typography>
          <RadioGroup {...field} row value={field.value ?? ""}>
            <FormControlLabel value="Yes" control={<Radio size="small" />} label="Yes" />
            <FormControlLabel value="No" control={<Radio size="small" />} label="No" />
          </RadioGroup>
          {fieldState.error && <FormHelperText>{fieldState.error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}

interface AutocompleteFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options: readonly string[];
  required?: boolean;
  freeSolo?: boolean;
}

export function AutocompleteField<T extends FieldValues>({
  name, control, label, options, required, freeSolo
}: AutocompleteFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Autocomplete
          options={options as string[]}
          value={field.value ?? null}
          freeSolo={freeSolo}
          onChange={(_, val) => field.onChange(val ?? "")}
          onBlur={field.onBlur}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              required={required}
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
              inputRef={field.ref}
            />
          )}
        />
      )}
    />
  );
}

const filterOptionsInstance = createFilterOptions<string>();

interface MultiAutocompleteFieldProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options: readonly string[];
  required?: boolean;
  freeSolo?: boolean;
  placeholder?: string;
  helperText?: string;
}

export function MultiAutocompleteField<T extends FieldValues>({
  name,
  control,
  label,
  options,
  required,
  freeSolo = true,
  placeholder,
  helperText,
}: MultiAutocompleteFieldProps<T>) {
  const [inputValue, setInputValue] = useState("");

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        // Normalize value to array of non-empty strings
        const rawValue = field.value as unknown;
        const currentValues: string[] = Array.isArray(rawValue)
          ? rawValue.map(String).filter(Boolean)
          : typeof rawValue === "string" && rawValue.trim().length > 0
          ? rawValue.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        const commitValues = (newVals: (string | unknown)[]) => {
          const flattened = newVals.flatMap((item) => {
            if (typeof item === "string") {
              const cleanedItem = item.startsWith('Add "') && item.endsWith('"')
                ? item.slice(5, -1).trim()
                : item.trim();
              if (cleanedItem.includes(",")) {
                return cleanedItem.split(",").map((p) => p.trim()).filter(Boolean);
              }
              return cleanedItem ? [cleanedItem] : [];
            }
            return [];
          });

          const unique = Array.from(new Set(flattened));
          field.onChange(unique);
        };

        const commitCurrentInput = () => {
          const trimmed = inputValue.trim();
          if (!trimmed) return;
          const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
          const combined = Array.from(new Set([...currentValues, ...parts]));
          field.onChange(combined);
          setInputValue("");
        };

        return (
          <Autocomplete<string, true, false, true>
            multiple
            freeSolo={freeSolo ? true : undefined}
            options={options as string[]}
            value={currentValues}
            inputValue={inputValue}
            onInputChange={(_, newInputValue, reason) => {
              if (reason === "input") {
                if (newInputValue.includes(",")) {
                  const parts = newInputValue.split(",").map((p) => p.trim()).filter(Boolean);
                  const combined = Array.from(new Set([...currentValues, ...parts]));
                  field.onChange(combined);
                  setInputValue("");
                  return;
                }
              }
              setInputValue(newInputValue);
            }}
            onChange={(_, newValue) => {
              commitValues(newValue);
              setInputValue("");
            }}
            filterOptions={(opts, params) => {
              const filtered = filterOptionsInstance(opts, params);
              const { inputValue: query } = params;
              const trimmed = query.trim();
              const isExisting = opts.some(
                (opt) => opt.toLowerCase() === trimmed.toLowerCase()
              );
              if (trimmed !== "" && !isExisting && freeSolo) {
                filtered.unshift(`Add "${trimmed}"`);
              }
              return filtered;
            }}
            onBlur={() => {
              if (inputValue.trim()) {
                commitCurrentInput();
              }
              field.onBlur();
            }}
            renderValue={(tagValues, getItemProps) =>
              tagValues.map((option, index) => {
                const { key, ...itemProps } = getItemProps({ index });
                return (
                  <Chip
                    key={key}
                    label={option}
                    size="small"
                    color="primary"
                    variant="filled"
                    sx={{
                      fontWeight: 600,
                      borderRadius: "6px",
                      backgroundColor: "rgba(59, 130, 246, 0.25)",
                      border: "1px solid rgba(59, 130, 246, 0.5)",
                      color: "#93c5fd",
                      "& .MuiChip-deleteIcon": {
                        color: "#93c5fd",
                        "&:hover": { color: "#ffffff" }
                      }
                    }}
                    {...itemProps}
                  />
                );
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                required={required && currentValues.length === 0}
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? helperText}
                inputRef={field.ref}
                placeholder={currentValues.length === 0 ? (placeholder || "Select from dropdown or type and press Enter") : ""}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (inputValue.trim()) {
                      e.preventDefault();
                      commitCurrentInput();
                    }
                  }
                }}
              />
            )}
          />
        );
      }}
    />
  );
}


interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 800,
          letterSpacing: "-0.3px",
          color: "#93c5fd",
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5, lineHeight: 1.5 }}>
          {subtitle}
        </Typography>
      )}
      <Divider sx={{ mt: 1.75, borderColor: "rgba(255, 255, 255, 0.08)" }} />
    </Box>
  );
}

interface FormCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function FormCard({ children, title, subtitle }: FormCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        mb: 3.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "rgba(255, 255, 255, 0.1)",
        background: "linear-gradient(180deg, #111827 0%, #0c101a 100%)",
        boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.4), 0 1px 3px 0 rgba(0, 0, 0, 0.2)",
      }}
    >
      {title && <SectionHeader title={title} subtitle={subtitle} />}
      {children}
    </Paper>
  );
}

export function RequiredChip() {
  return <Chip label="Required" size="small" color="error" variant="outlined" sx={{ ml: 1, height: 18, fontSize: 10 }} />;
}
