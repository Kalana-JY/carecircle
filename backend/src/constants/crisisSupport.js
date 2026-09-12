const CRISIS_ENTRY_TYPES = ['hospital', 'counselor', 'organization', 'helpline'];
const NEARBY_ENTRY_TYPES = ['hospital', 'counselor', 'organization'];
const CRISIS_WRITABLE_FIELDS = [
  'name',
  'type',
  'description',
  'phone',
  'alternatePhone',
  'email',
  'website',
  'address',
  'city',
  'region',
  'country',
  'hours',
  'languages',
  'services',
  'isEmergency',
  'is24Hours',
  'isPublished',
];

module.exports = {
  CRISIS_ENTRY_TYPES,
  NEARBY_ENTRY_TYPES,
  CRISIS_WRITABLE_FIELDS,
};
