import { useState } from "react";
import { Grid, Typography, FormControlLabel, Checkbox, Box, CircularProgress, Chip } from "@mui/material";
import { type Control, type UseFormSetValue, type UseFormGetValues } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../schemas/candidateIntakeSchema";
import { TextInput, AutocompleteField, FormCard } from "./FormHelpers";
import { pincodeService } from "../../services/pincodeService";

const DEFAULT_CITY_OPTIONS = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Gurugram", "Noida", "Jaipur", "Lucknow", "Chandigarh", "Other"
];

interface Props {
  control: Control<CandidateIntakeSchema>;
  setValue: UseFormSetValue<CandidateIntakeSchema>;
  getValues: UseFormGetValues<CandidateIntakeSchema>;
}

export function AddressDetails({ control, setValue, getValues }: Props) {
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingPermanent, setLoadingPermanent] = useState(false);
  const [currentAreas, setCurrentAreas] = useState<string[]>([]);
  const [permanentAreas, setPermanentAreas] = useState<string[]>([]);

  const handleCopyCurrentToPermanent = (checked: boolean) => {
    setSameAsCurrent(checked);
    if (checked) {
      const current = getValues("address.current");
      if (current) {
        setValue("address.permanent.address_line", current.address_line ?? "", { shouldValidate: true });
        setValue("address.permanent.pincode", current.pincode ?? "", { shouldValidate: true });
        setValue("address.permanent.area", current.area ?? "", { shouldValidate: true });
        setValue("address.permanent.city", current.city ?? "", { shouldValidate: true });
        setValue("address.permanent.state", current.state ?? "", { shouldValidate: true });
        setPermanentAreas(currentAreas);
      }
    }
  };

  const handlePincodeLookup = async (type: "current" | "permanent") => {
    const pCode = type === "current" ? getValues("address.current.pincode") : getValues("address.permanent.pincode");
    if (!pCode || pCode.length !== 6) return;

    if (type === "current") setLoadingCurrent(true);
    else setLoadingPermanent(true);

    try {
      const info = await pincodeService.getLocationByPincode(pCode);
      if (info) {
        if (info.area) setValue(`address.${type}.area`, info.area, { shouldValidate: true });
        if (info.city) setValue(`address.${type}.city`, info.city, { shouldValidate: true });
        if (info.state) setValue(`address.${type}.state`, info.state, { shouldValidate: true });

        if (type === "current") setCurrentAreas(info.availableAreas);
        else setPermanentAreas(info.availableAreas);

        if (type === "current" && sameAsCurrent) {
          setValue("address.permanent.pincode", pCode, { shouldValidate: true });
          if (info.area) setValue("address.permanent.area", info.area, { shouldValidate: true });
          if (info.city) setValue("address.permanent.city", info.city, { shouldValidate: true });
          if (info.state) setValue("address.permanent.state", info.state, { shouldValidate: true });
        }
      }
    } finally {
      if (type === "current") setLoadingCurrent(false);
      else setLoadingPermanent(false);
    }
  };

  return (
    <FormCard title="Address & Location Information" subtitle="Provide candidate current and permanent residential details with automatic pincode lookup">
      <Grid container spacing={2.5}>
        {/* Current Address */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>Current Residential Address</Typography>
            <Chip label="Auto Pincode Enabled (India Post API)" size="small" color="success" variant="outlined" />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput
            name="address.current.pincode"
            control={control}
            label="Current Pincode"
            required
            inputProps={{ maxLength: 6, inputMode: "numeric" }}
            helperText="Enter 6-digit pincode for automatic locality & city fill"
            onBlur={() => handlePincodeLookup("current")}
            startAdornment={loadingCurrent ? <CircularProgress size={18} /> : undefined}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteField
            name="address.current.area"
            control={control}
            label="Area / Locality"
            options={currentAreas.length > 0 ? currentAreas : ["Koramangala", "Bandra West", "Whitefield", "Other"]}
            required
            freeSolo
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteField name="address.current.city" control={control} label="City / District" options={DEFAULT_CITY_OPTIONS} required freeSolo />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="address.current.state" control={control} label="State" placeholder="e.g. Maharashtra, Karnataka" />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextInput name="address.current.address_line" control={control} label="Full Address Line (Optional)" multiline rows={2} placeholder="House/Flat No., Street, Landmark" />
        </Grid>

        {/* Permanent Address */}
        <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600 }}>Permanent Address</Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={sameAsCurrent}
                  onChange={(e) => handleCopyCurrentToPermanent(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Same as Current Address</Typography>}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput
            name="address.permanent.pincode"
            control={control}
            label="Permanent Pincode"
            required
            inputProps={{ maxLength: 6, inputMode: "numeric" }}
            helperText="Enter 6-digit pincode"
            onBlur={() => handlePincodeLookup("permanent")}
            startAdornment={loadingPermanent ? <CircularProgress size={18} /> : undefined}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteField
            name="address.permanent.area"
            control={control}
            label="Permanent Area / Locality"
            options={permanentAreas.length > 0 ? permanentAreas : ["Sector 18", "Indiranagar", "Other"]}
            required
            freeSolo
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteField name="address.permanent.city" control={control} label="Permanent City / District" options={DEFAULT_CITY_OPTIONS} required freeSolo />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <TextInput name="address.permanent.state" control={control} label="Permanent State" placeholder="e.g. Delhi, Tamil Nadu" />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextInput name="address.permanent.address_line" control={control} label="Permanent Address Line (Optional)" multiline rows={2} placeholder="House/Flat No., Street, Landmark" />
        </Grid>
      </Grid>
    </FormCard>
  );
}
