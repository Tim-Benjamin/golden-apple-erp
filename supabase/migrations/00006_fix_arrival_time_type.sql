-- arrival_time should store just a time-of-day (e.g. "14:30"), not a full timestamp.
alter table reservations
  alter column arrival_time type time using arrival_time::time;