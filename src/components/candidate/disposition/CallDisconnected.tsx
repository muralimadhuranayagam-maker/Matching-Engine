import { Grid } from "@mui/material";
import { useWatch, type Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { NumberInput, YesNoRadio, SelectField, FormCard } from "../FormHelpers";
import { ENGLISH_COMMUNICATION_OPTIONS, FIT_DOMESTIC_NON_VOICE_OPTIONS } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }

export function CallDisconnected({ control }: Props) {
  const judgeComm = useWatch({ control, name: "call_disconnected_details.call_disconnected_judge_communication" });
  const commLevel = useWatch({ control, name: "call_disconnected_details.call_disconnected_english_communication" });
  const isPoorOrAvg = commLevel === "Poor" || commLevel === "Average";

  return (
    <FormCard title="Call Disconnected Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberInput name="call_disconnected_details.call_duration_seconds" control={control} label="Call Duration (seconds)" required min={0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <YesNoRadio name="call_disconnected_details.call_disconnected_judge_communication" control={control} label="Able to Judge Communication?" required />
        </Grid>
        {judgeComm === "Yes" && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectField name="call_disconnected_details.call_disconnected_english_communication" control={control} label="English Communication Level" options={ENGLISH_COMMUNICATION_OPTIONS} required />
            </Grid>
            {commLevel && isPoorOrAvg && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <SelectField name="call_disconnected_details.call_disconnected_fit_domestic_or_non_voice" control={control} label="Fit for Domestic / Non-Voice?" options={FIT_DOMESTIC_NON_VOICE_OPTIONS} required />
              </Grid>
            )}
            {commLevel && !isPoorOrAvg && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <YesNoRadio name="call_disconnected_details.call_disconnected_send_details_for_callback" control={control} label="Send Details for Callback?" required />
              </Grid>
            )}
          </>
        )}
      </Grid>
    </FormCard>
  );
}
