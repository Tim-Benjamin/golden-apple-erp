create extension if not exists btree_gist;

alter table reservations
add constraint no_overlapping_active_reservations
exclude using gist (
  room_id with =,
  daterange(check_in_date, check_out_date, '[)') with &&
) where (status in ('pending', 'confirmed', 'checked_in'));