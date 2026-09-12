-- Wave 0 (numbers and hygiene) of the Daily Word experience build. Every
-- tracked event needs to carry the reader's path (comfort, new_to_faith,
-- pastor_leader, deeper_study) and, for new_to_faith, which journey day it
-- was fired on, so activity can be read as D1/D7/D30 retention per path
-- instead of one undifferentiated stream. public.activity_events exists in
-- prod already (created ad hoc, never migrated); this adds the two columns
-- the client and netlify/functions/track-activity.js are about to start
-- writing. Additive and nullable: existing rows are untouched, and nothing
-- yet requires either column to be present.

alter table public.activity_events add column if not exists path text;
alter table public.activity_events add column if not exists journey_day integer;

comment on column public.activity_events.path is 'Reader path at the time of the event: comfort, new_to_faith, pastor_leader, or deeper_study. Nullable; not every event is path-scoped.';
comment on column public.activity_events.journey_day is 'For new_to_faith readers, the journey day (dw_pathway_progress.currentDay) active when the event fired. Nullable; not applicable outside the new_to_faith journey.';
