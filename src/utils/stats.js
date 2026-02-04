export const getLocalDateKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const calculateDynamicStreak = (counts) => {
  if (!counts || Object.keys(counts).length === 0) return 0;
  let currentStreak = 0;
  let dateToTrace = new Date();
  dateToTrace.setHours(0, 0, 0, 0);
  const todayKey = getLocalDateKey(dateToTrace);
  const yesterday = new Date(dateToTrace);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);
  if (!counts[todayKey] && !counts[yesterdayKey]) return 0;
  if (!counts[todayKey]) dateToTrace = yesterday;
  while (true) {
    const key = getLocalDateKey(dateToTrace);
    if (counts[key] && counts[key] > 0) {
      currentStreak++;
      dateToTrace.setDate(dateToTrace.getDate() - 1);
    } else { break; }
  }
  return currentStreak;
};

export const getTagColor = (tag) => {
  if (!tag) return '#888';
  let hash = 0;
  const tagStr = String(tag);
  const TAG_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
  for (let i = 0; i < tagStr.length; i++) { hash = tagStr.charCodeAt(i) + ((hash << 5) - hash); }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};
