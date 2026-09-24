import { useEffect, useRef } from "react";
import {
  Grid, Button, Typography, Box, Paper, IconButton, Chip, Stack
} from "@mui/material";
import { useFieldArray, Controller, useWatch, useFormContext, type Control } from "react-hook-form";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { parse, format, isValid } from "date-fns";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";
import { TextInput, YesNoRadio, NumberInput } from "./FormHelpers";

interface Props {
  control: Control<CandidateIntakeSchema>;
  namePath?: any;
  setValue?: any;
  syncWithTotalCompanies?: boolean;
}

function DateField({ name, control, label }: { name: any; control: any; label: string }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        let val: Date | null = null;
        if (field.value) {
          const p = parse(field.value, "dd-MM-yyyy", new Date());
          val = isValid(p) ? p : null;
        }
        return (
          <DatePicker
            label={label}
            value={val}
            onChange={(d) => field.onChange(d && isValid(d) ? format(d, "dd-MM-yyyy") : "")}
            format="dd/MM/yyyy"
            slotProps={{
              textField: {
                fullWidth: true,
                size: "small",
                error: !!fieldState.error,
                helperText: fieldState.error?.message,
                inputRef: field.ref,
                onBlur: field.onBlur,
              },
            }}
          />
        );
      }}
    />
  );
}

const createBlankCompany = () => ({
  company_name: "",
  process_name: "",
  skill: "",
  role: "",
  start_date: "",
  end_date: "",
  last_salary: 0,
  reason_for_leaving: "",
  has_pay_slip: "No" as const,
  has_offer_letter: "No" as const,
  has_experience_letter: "No" as const,
});

export function CompanyExperienceList({
  control,
  namePath = "employment_history.previous_companies",
  setValue: propSetValue,
  syncWithTotalCompanies = true,
}: Props) {
  const formContext = useFormContext<CandidateIntakeSchema>();
  const effectiveSetValue = propSetValue || formContext?.setValue;

  const { fields, append, remove } = useFieldArray({
    control,
    name: namePath as any,
  });

  // Watch total_companies from professional_profile
  const totalCompanies = useWatch({
    control,
    name: "professional_profile.total_companies",
  });

  const prevSyncCountRef = useRef<number | null>(null);

  // Synchronize dynamic boxes whenever totalCompanies changes in Section 4
  useEffect(() => {
    if (!syncWithTotalCompanies) return;

    // Avoid reacting if user is in middle of editing or cleared input temporarily
    if (typeof totalCompanies !== "number" || isNaN(totalCompanies)) {
      return;
    }

    const targetCount = Math.max(0, totalCompanies);
    const currentCount = fields.length;

    if (targetCount === currentCount) {
      prevSyncCountRef.current = targetCount;
      return;
    }

    if (targetCount > currentCount) {
      const diff = targetCount - currentCount;
      const newEntries = Array.from({ length: diff }, () => createBlankCompany());
      append(newEntries, { shouldFocus: false });

      if (effectiveSetValue) {
        effectiveSetValue("professional_profile.work_status", "EXPERIENCED", { shouldDirty: true });
      }
    } else if (targetCount < currentCount) {
      const indicesToRemove: number[] = [];
      for (let i = targetCount; i < currentCount; i++) {
        indicesToRemove.push(i);
      }
      remove(indicesToRemove);

      if (targetCount === 0 && effectiveSetValue) {
        effectiveSetValue("professional_profile.work_status", "FRESHER", { shouldDirty: true });
      }
    }

    prevSyncCountRef.current = targetCount;
  }, [totalCompanies, fields.length, append, remove, effectiveSetValue, syncWithTotalCompanies]);

  const handleAddCompany = () => {
    const newCount = fields.length + 1;
    if (effectiveSetValue) {
      effectiveSetValue("professional_profile.total_companies", newCount, { shouldDirty: true });
      effectiveSetValue("professional_profile.work_status", "EXPERIENCED", { shouldDirty: true });
    }
    append(createBlankCompany(), { shouldFocus: false });
  };

  const handleRemoveCompany = (index: number) => {
    const newCount = Math.max(0, fields.length - 1);
    if (effectiveSetValue) {
      effectiveSetValue("professional_profile.total_companies", newCount, { shouldDirty: true });
      if (newCount === 0) {
        effectiveSetValue("professional_profile.work_status", "FRESHER", { shouldDirty: true });
      }
    }
    remove(index);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <BusinessIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Employment History & Companies Worked
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fields.length === 0
                ? "Fresher — No companies added. To add, increase 'Total Companies Worked' or click below."
                : `Showing ${fields.length} company ${fields.length === 1 ? "box" : "boxes"} based on Total Companies Worked`}
            </Typography>
          </Box>
        </Stack>
        <Chip
          label={`${fields.length} ${fields.length === 1 ? "Company" : "Companies"}`}
          size="small"
          color={fields.length > 0 ? "primary" : "default"}
          variant={fields.length > 0 ? "filled" : "outlined"}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Empty State when 0 companies */}
      {fields.length === 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mb: 2,
            textAlign: "center",
            borderRadius: 2,
            borderStyle: "dashed",
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          <WorkIcon sx={{ fontSize: 36, color: "text.secondary", mb: 1, opacity: 0.7 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>
            No companies added (Fresher profile). Set "Total Companies Worked" in Section 4 above or click below to add employment history.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddCompany}
          >
            Add Company
          </Button>
        </Paper>
      )}

      {/* Company Cards */}
      {fields.map((field, index) => {
        const isCurrent = index === 0;
        return (
          <Paper
            key={field.id}
            variant="outlined"
            sx={{
              p: 2.5,
              mb: 2.5,
              borderRadius: 2,
              position: "relative",
              borderColor: isCurrent ? "primary.main" : "divider",
              borderWidth: isCurrent ? 2 : 1,
              bgcolor: "background.paper",
              boxShadow: isCurrent ? "0 2px 12px rgba(25, 118, 210, 0.08)" : "none",
            }}
          >
            {/* Card Header */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, pb: 1, borderBottom: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.95rem" }} color="primary.main">
                  {isCurrent ? "Company 1 (Current / Most Recent)" : `Company ${index + 1} (Previous Company)`}
                </Typography>
                <Chip
                  label={isCurrent ? "Current / Recent" : `Previous #${index}`}
                  size="small"
                  color={isCurrent ? "primary" : "default"}
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600 }}
                />
              </Stack>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveCompany(index)}
                aria-label={`Remove company ${index + 1}`}
                title="Remove this company"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Card Fields */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextInput
                  name={`${namePath}.${index}.company_name` as any}
                  control={control}
                  label="Company Name"
                  placeholder="e.g. Concentrix, TCS, Infosys"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextInput
                  name={`${namePath}.${index}.process_name` as any}
                  control={control}
                  label="Process / Account Name"
                  placeholder="e.g. Customer Support, Technical Process"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextInput
                  name={`${namePath}.${index}.role` as any}
                  control={control}
                  label="Role / Designation"
                  placeholder="e.g. Senior Associate, Software Engineer"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextInput
                  name={`${namePath}.${index}.skill` as any}
                  control={control}
                  label="Primary Skill"
                  placeholder="e.g. Voice Inbound, .NET, React"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DateField
                  name={`${namePath}.${index}.start_date`}
                  control={control}
                  label="Start Date / Joining Date"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DateField
                  name={`${namePath}.${index}.end_date`}
                  control={control}
                  label={isCurrent ? "End Date / Last Working Day (or Current)" : "End Date / Relieving Date"}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <NumberInput
                  name={`${namePath}.${index}.last_salary` as any}
                  control={control}
                  label={isCurrent ? "Current / Last Monthly Salary (₹)" : "Last Monthly Salary (₹)"}
                  min={0}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextInput
                  name={`${namePath}.${index}.reason_for_leaving` as any}
                  control={control}
                  label={isCurrent ? "Notice Period / Reason for Leaving" : "Reason for Leaving"}
                  placeholder="e.g. Career growth, 30 Days Notice, Relocation"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <YesNoRadio
                  name={`${namePath}.${index}.has_pay_slip` as any}
                  control={control}
                  label="Has Pay Slip?"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <YesNoRadio
                  name={`${namePath}.${index}.has_offer_letter` as any}
                  control={control}
                  label="Has Offer Letter?"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <YesNoRadio
                  name={`${namePath}.${index}.has_experience_letter` as any}
                  control={control}
                  label="Has Experience Letter?"
                  required
                />
              </Grid>
            </Grid>
          </Paper>
        );
      })}

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddCompany}
        sx={{ mt: 1, fontWeight: 600 }}
      >
        {fields.length === 0 ? "Add Company" : "Add Another Company"}
      </Button>
    </Box>
  );
}
