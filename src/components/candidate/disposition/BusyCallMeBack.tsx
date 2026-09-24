import { Grid } from "@mui/material";
import { useWatch, type Control } from "react-hook-form";
import type { CandidateIntakeSchema } from "../../../schemas/candidateIntakeSchema";
import { SelectField, YesNoRadio, FormCard } from "../FormHelpers";
import { ENGLISH_COMMUNICATION_OPTIONS } from "../../../config/options";

interface Props { control: Control<CandidateIntakeSchema>; }
export function BusyCallMeBack({ control }: Props) {
  const canJudge = useWatch({ control, name: "busy_call_me_back_details.able_to_judge_communication" });
  return (
    <FormCard title="Busy – Call Me Back Details">
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <YesNoRadio name="busy_call_me_back_details.able_to_judge_communication" control={control} label="Able to Judge Communication?" required />
        </Grid>
        {canJudge === "Yes" && (
          <>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SelectField name="busy_call_me_back_details.callback_english_communication" control={control} label="English Communication (Callback)" options={ENGLISH_COMMUNICATION_OPTIONS} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <YesNoRadio name="busy_call_me_back_details.send_details_for_callback" control={control} label="Send Details for Callback?" required />
            </Grid>
          </>
        )}
      </Grid>
    </FormCard>
  );
}
