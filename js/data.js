const HZAU = {
  name: '华中农业大学',
  short: '华农',
  motto: '勤读力耕 · 立己达人',
  system: '校园运动场馆预约系统',
};

const OPEN_HOUR = 8;
const CLOSE_HOUR = 22;
const RETENTION_DAYS = 7;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function todayStr() {
  return toDateStr(new Date());
}

function dateStr(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toDateStr(d);
}

function nowStamp() {
  const d = new Date();
  return toDateStr(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

function monthBounds() {
  const d = new Date();
  return {
    min: toDateStr(new Date(d.getFullYear(), d.getMonth(), 1)),
    max: toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    label: d.getFullYear() + '年' + (d.getMonth() + 1) + '月',
  };
}

function isPastSlot(date, slotId) {
  const today = todayStr();
  if (date > today) return false;
  if (date < today) return true;
  return slotId <= new Date().getHours();
}

function slotStartDate(date, slotId) {
  const parts = String(date || '').split('-');
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), Number(slotId), 0, 0, 0);
}

const TIME_SLOTS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => {
  const h = OPEN_HOUR + i;
  return { id: h, label: pad2(h) + ':00 - ' + pad2(h + 1) + ':00', short: pad2(h) + ':00' };
});

const VENUE_TYPES = [
  { id: 'badminton', name: '羽毛球馆', group: '东体育馆', location: '东体育馆 3楼', icon: '🏸', count: 20, capacity: 4, prefix: '羽' },
  { id: 'volleyball-old', name: '排球老场', group: '第二运动场', location: '第二运动场', icon: '🏐', count: 8, capacity: 12, prefix: '排' },
  { id: 'volleyball-new', name: '排球新场', group: '第三运动场', location: '第三运动场', icon: '🏐', count: 6, capacity: 12, prefix: '排' },
  { id: 'volleyball-indoor', name: '排球室内场', group: '西体育馆', location: '西体育馆', icon: '🏐', count: 1, capacity: 12, prefix: '排' },
  { id: 'pingpong', name: '乒乓球馆', group: '东体育馆', location: '东体育馆 1楼', icon: '🏓', count: 36, capacity: 4, prefix: '乒' },
  { id: 'tennis-indoor', name: '室内网球馆', group: '东体育馆', location: '东体育馆 2楼', icon: '🎾', count: 3, capacity: 4, prefix: '网' },
  { id: 'tennis-outdoor', name: '室外网球场', group: '室外场地', location: '室外网球场', icon: '🎾', count: 4, capacity: 4, prefix: '网' },
  { id: 'swim-male', name: '游泳馆（男）', group: '东体育馆游泳馆', location: '东体育馆 游泳馆', icon: '🏊', count: 1, capacity: 1, prefix: '泳' },
  { id: 'swim-female', name: '游泳馆（女）', group: '东体育馆游泳馆', location: '东体育馆 游泳馆', icon: '🏊', count: 1, capacity: 1, prefix: '泳' },
];

const VENUE_MAP = {};
VENUE_TYPES.forEach((t) => { VENUE_MAP[t.id] = t; });

const VENUES = [];
VENUE_TYPES.forEach((t) => {
  for (let i = 1; i <= t.count; i += 1) {
    VENUES.push({ typeId: t.id, no: pad2(i), index: i, code: t.prefix + pad2(i) });
  }
});

const SEED_USERS = [
  {
    id: 'u_admin', role: 'admin', account: 'admin', password: 'admin123', mustChangePassword: true,
    name: '系统管理员', gender: '', age: '', grade: '', major: '', className: '', hobbies: '', bio: '校园运动场馆预约系统超级管理员',
    avatar: '', createdAt: '2026-08-20', banned: false, muted: false, friends: [],
  },
];
const SEED_NOTICES = [
  { id: 'n1', title: '场馆开放时间', content: '各场馆每天 08:00-22:00 开放，每小时为一个预约时段，可预约本月内的日期，请按预约时段入场。', createdAt: dateStr(-9) + ' 09:00', by: '系统管理员' },
  { id: 'n2', title: '预约须知', content: '预约需填写预约理由；同一时段只能预约一个场馆，如需更换请先取消原预约。预约提交后由管理员审核。', createdAt: dateStr(-6) + ' 10:30', by: '系统管理员' },
  { id: 'n3', title: '文明使用场馆', content: '请爱护场馆设施与器材，活动结束后按时离场，并带走个人物品与垃圾。', createdAt: dateStr(-3) + ' 15:00', by: '系统管理员' },
];
