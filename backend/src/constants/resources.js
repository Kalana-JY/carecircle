const RESOURCE_TYPES = ['article', 'video', 'self-help-guide'];
const SHARE_METHODS = ['link', 'email', 'sms'];
const RESOURCE_WRITABLE_FIELDS = [
  'title',
  'description',
  'content',
  'url',
  'category',
  'topics',
  'type',
  'tags',
  'phone',
  'address',
  'source',
  'author',
  'durationMinutes',
  'steps',
  'isPublished',
];

module.exports = {
  RESOURCE_TYPES,
  SHARE_METHODS,
  RESOURCE_WRITABLE_FIELDS,
};
