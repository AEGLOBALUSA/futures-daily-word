-- Corrects the column comment added by 20260912_activity_events_path_journey_day.sql.
-- That comment listed four reader paths and omitted `congregation`, which is the
-- default path for a church member and therefore likely to be the LARGEST bucket
-- in the table. Anyone reading D1/D7/D30 retention per path from the comment alone
-- would have silently mis-bucketed the biggest cohort. The authoritative set is the
-- five personas in src/utils/persona-config.ts.
--
-- Comment only: no data or type change.

comment on column public.activity_events.path is 'Reader path at the time of the event, one of the five personas in src/utils/persona-config.ts: new_to_faith, congregation, deeper_study, pastor_leader, comfort. Nullable; not every event is path-scoped, and the value is validated server-side in netlify/functions/lib/activity-rows.js.';
