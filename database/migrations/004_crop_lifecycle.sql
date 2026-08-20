-- Per-crop lifecycle for sow → harvest → sell calendars.
-- New crops added to crop_reference should set these (or category) so timelines apply automatically.
ALTER TABLE crop_reference
    ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS days_to_harvest_min SMALLINT,
    ADD COLUMN IF NOT EXISTS days_to_harvest_max SMALLINT,
    ADD COLUMN IF NOT EXISTS days_to_sell_min SMALLINT,
    ADD COLUMN IF NOT EXISTS days_to_sell_max SMALLINT,
    ADD COLUMN IF NOT EXISTS lifecycle_note VARCHAR(160);

-- UK seed-packet / RHS-style maturity windows (from plant / sow date).
UPDATE crop_reference SET
    category = 'fruiting',
    days_to_harvest_min = 70,
    days_to_harvest_max = 90,
    days_to_sell_min = 75,
    days_to_sell_max = 100,
    lifecycle_note = 'Outdoor tomato guide maturity'
WHERE slug = 'tomato';

UPDATE crop_reference SET
    category = 'grain',
    days_to_harvest_min = 90,
    days_to_harvest_max = 120,
    days_to_sell_min = 95,
    days_to_sell_max = 130,
    lifecycle_note = 'Sweetcorn / maize maturity'
WHERE slug = 'maize';

UPDATE crop_reference SET
    category = 'grain',
    days_to_harvest_min = 100,
    days_to_harvest_max = 140,
    days_to_sell_min = 105,
    days_to_sell_max = 150,
    lifecycle_note = 'Rice maturity (limited UK outdoor fit)'
WHERE slug = 'rice';

UPDATE crop_reference SET
    category = 'grain',
    days_to_harvest_min = 120,
    days_to_harvest_max = 180,
    days_to_sell_min = 125,
    days_to_sell_max = 190,
    lifecycle_note = 'Winter / spring wheat style window'
WHERE slug = 'wheat';

UPDATE crop_reference SET
    category = 'root',
    days_to_harvest_min = 80,
    days_to_harvest_max = 110,
    days_to_sell_min = 85,
    days_to_sell_max = 120,
    lifecycle_note = 'Maincrop potato guide'
WHERE slug = 'potato';

UPDATE crop_reference SET
    category = 'leafy',
    days_to_harvest_min = 70,
    days_to_harvest_max = 100,
    days_to_sell_min = 75,
    days_to_sell_max = 110,
    lifecycle_note = 'Cabbage heading maturity'
WHERE slug = 'cabbage';

UPDATE crop_reference SET
    category = 'root',
    days_to_harvest_min = 90,
    days_to_harvest_max = 120,
    days_to_sell_min = 95,
    days_to_sell_max = 130,
    lifecycle_note = 'Bulb onion maturity'
WHERE slug = 'onion';

UPDATE crop_reference SET
    category = 'root',
    days_to_harvest_min = 70,
    days_to_harvest_max = 100,
    days_to_sell_min = 75,
    days_to_sell_max = 110,
    lifecycle_note = 'Carrot maturity'
WHERE slug = 'carrot';

UPDATE crop_reference SET
    category = 'fruiting',
    days_to_harvest_min = 80,
    days_to_harvest_max = 100,
    days_to_sell_min = 85,
    days_to_sell_max = 110,
    lifecycle_note = 'Chili / pepper maturity'
WHERE slug = 'chili';

UPDATE crop_reference SET
    category = 'legume',
    days_to_harvest_min = 55,
    days_to_harvest_max = 75,
    days_to_sell_min = 60,
    days_to_sell_max = 85,
    lifecycle_note = 'French / runner bean style'
WHERE slug = 'beans';
