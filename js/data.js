const HZAU = {
  name: '华中农业大学',
  short: '华农',
  motto: '勤读力耕 · 立己达人',
  system: '校园运动场馆预约系统',
  version: '原型 v1',
};

const OPEN_HOUR = 8;
const CLOSE_HOUR = 22;

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

const REASON_POOL = ['日常约球', '院队训练', '班级活动', '朋友聚会打球', '体育课练习', '社团活动'];

const NAME_POOL = ['刘洋', '赵敏', '孙浩', '周琳', '吴桐', '郑凯', '冯雪', '何嘉', '许阳', '邓佳', '曾磊', '崔莹', '宋涛', '谢雨', '钟鸣', '葛亮'];

const SEED_USERS = [
  {
    id: 'u_admin', role: 'admin', account: 'admin', password: 'admin123', mustChangePassword: true,
    name: '系统管理员', gender: '', age: '', grade: '', major: '', className: '', hobbies: '', bio: '校园运动场馆预约系统超级管理员',
    avatar: '', createdAt: '2026-08-20', banned: false, muted: false, friends: [],
  },
  {
    id: 'u_zhangwei', role: 'student', studentId: '20213001', password: '123456', name: '张伟',
    gender: '男', age: 20, grade: '2021级', major: '计算机科学与技术', className: '计科2101班',
    hobbies: '篮球、羽毛球、编程', bio: '喜欢打球，也喜欢写代码，欢迎一起组队！', avatar: '',
    createdAt: '2026-09-01', banned: false, muted: false, friends: ['u_lina'],
  },
  {
    id: 'u_lina', role: 'student', studentId: '20213002', password: '123456', name: '李娜',
    gender: '女', age: 19, grade: '2021级', major: '园艺学', className: '园艺2102班',
    hobbies: '排球、游泳、摄影', bio: '院排球队队员，常在三运打球～', avatar: '',
    createdAt: '2026-09-02', banned: false, muted: false, friends: ['u_zhangwei'],
  },
  {
    id: 'u_wangqiang', role: 'student', studentId: '20213003', password: '123456', name: '王强',
    gender: '男', age: 21, grade: '2020级', major: '机械设计制造及其自动化', className: '机械2003班',
    hobbies: '乒乓球、跑步', bio: '乒乓球馆常客，约球找我。', avatar: '',
    createdAt: '2026-09-03', banned: false, muted: false, friends: [],
  },
  {
    id: 'u_chenjing', role: 'student', studentId: '20213004', password: '123456', name: '陈静',
    gender: '女', age: 20, grade: '2021级', major: '外国语学院英语', className: '英语2101班',
    hobbies: '网球、游泳、阅读', bio: '想找固定球友一起打球。', avatar: '',
    createdAt: '2026-09-05', banned: false, muted: false, friends: [],
  },
];
const SEED_NOTICES = [
  { id: 'n1', title: '国庆假期场馆开放安排', content: '10月1日-3日东体育馆闭馆检修，其余时间正常开放 08:00-22:00。', createdAt: '2026-10-01 09:00', by: '系统管理员' },
  { id: 'n2', title: '羽毛球馆新增 4 片场地', content: '东体育馆 3楼新增 4 片羽毛球场地，已在预约系统中开放，欢迎大家预约使用。', createdAt: '2026-10-08 14:30', by: '系统管理员' },
];

const SEED_POSTS = [
  { id: 'p1', userId: 'u_lina', content: '排球新场（第三运动场）周末下午有人一起打吗？想组个 12 人的局。', createdAt: '2026-10-11 20:15', likes: ['u_zhangwei', 'u_chenjing'], favorites: ['u_zhangwei'], comments: [{ id: 'c1', userId: 'u_zhangwei', content: '我报名！可以约下午 4 点。', createdAt: '2026-10-11 20:40' }] },
  { id: 'p2', userId: 'u_wangqiang', content: '乒乓球馆 1 楼晚上人不多，推荐大家错峰来打球。', createdAt: '2026-10-10 19:05', likes: ['u_lina'], favorites: [], comments: [{ id: 'c2', userId: 'u_chenjing', content: '收到，明晚去看看～', createdAt: '2026-10-10 19:30' }] },
];

function makeRng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seedUserName(id) {
  const u = SEED_USERS.find((x) => x.id === id);
  return u ? u.name : '同学';
}

function seedBookings() {
  const rng = makeRng(20261012);
  const list = [];
  const dates = [dateStr(0), dateStr(1), dateStr(2)];
  const activeUsers = ['u_lina', 'u_wangqiang', 'u_chenjing'];
  let seq = 1;
  VENUE_TYPES.forEach((t) => {
    const shownVenues = Math.min(t.count, 12);
    dates.forEach((date, di) => {
      const base = [0.55, 0.35, 0.18][di];
      for (let v = 1; v <= shownVenues; v += 1) {
        const slotCount = Math.floor(TIME_SLOTS.length * base * (0.2 + rng()));
        for (let k = 0; k < slotCount; k += 1) {
          const slot = TIME_SLOTS[Math.floor(rng() * TIME_SLOTS.length)].id;
          const no = pad2(v);
          if (list.some((b) => b.venueTypeId === t.id && b.venueNo === no && b.date === date && b.slot === slot)) continue;
          const userId = activeUsers[Math.floor(rng() * activeUsers.length)];
          const ownerName = seedUserName(userId);
          const members = [ownerName];
          const extra = Math.floor(rng() * 3);
          for (let m = 0; m < extra; m += 1) members.push(NAME_POOL[Math.floor(rng() * NAME_POOL.length)]);
          list.push({
            id: 'b_seed_' + (seq++),
            userId: userId,
            venueTypeId: t.id,
            venueNo: no,
            date: date,
            slot: slot,
            reason: REASON_POOL[Math.floor(rng() * REASON_POOL.length)],
            members: members,
            status: rng() > 0.88 ? 'pending' : 'approved',
            createdAt: date + ' 08:00',
            teamId: null,
            note: '',
          });
        }
      }
    });
  });
  const mine = [
    { venueTypeId: 'badminton', venueNo: '01', date: dateStr(0), slot: 19, status: 'approved', reason: '晚上和室友打双打' },
    { venueTypeId: 'badminton', venueNo: '03', date: dateStr(1), slot: 17, status: 'approved', reason: '院羽毛球队训练' },
    { venueTypeId: 'pingpong', venueNo: '08', date: dateStr(0), slot: 20, status: 'pending', reason: '乒乓球课课后练习' },
    { venueTypeId: 'tennis-outdoor', venueNo: '02', date: dateStr(1), slot: 16, status: 'pending', reason: '和同学约球' },
    { venueTypeId: 'swim-male', venueNo: '01', date: dateStr(2), slot: 12, status: 'approved', reason: '日常游泳锻炼' },
  ];
  mine.forEach((m) => {
    if (list.some((b) => b.venueTypeId === m.venueTypeId && b.venueNo === m.venueNo && b.date === m.date && b.slot === m.slot)) return;
    const members = ['张伟'];
    const extra = (m.slot % 2) + 1;
    for (let i = 0; i < extra; i += 1) members.push(NAME_POOL[(i * 3) % NAME_POOL.length]);
    list.push({
      id: 'b_seed_mine_' + m.venueTypeId + m.venueNo + m.slot,
      userId: 'u_zhangwei', venueTypeId: m.venueTypeId, venueNo: m.venueNo, date: m.date, slot: m.slot,
      reason: m.reason, members: members, status: m.status,
      createdAt: m.date + ' 08:10', teamId: null, note: '',
    });
  });
  return list;
}

function seedTeams() {
  return [
    {
      id: 't1',
      userId: 'u_lina',
      venueTypeId: 'volleyball-new',
      venueNo: '03',
      date: dateStr(1),
      slot: 15,
      need: 12,
      title: '排球新场 明天下午 15:00 缺 3 人',
      contact: '微信 lina-volley',
      note: '水平不限，欢迎新手，有球。',
      members: [
        { userId: 'u_lina', name: '李娜', status: 'joined' },
        { userId: 'u_zhangwei', name: '张伟', status: 'joined' },
        { userId: 'u_wangqiang', name: '王强', status: 'pending' },
      ],
      createdAt: dateStr(-1) + ' 20:20',
      status: 'open',
    },
    {
      id: 't2',
      userId: 'u_chenjing',
      venueTypeId: 'badminton',
      venueNo: '07',
      date: dateStr(2),
      slot: 18,
      need: 4,
      title: '羽毛球双打，东体育馆 3 楼，缺 2 人',
      contact: '微信 chenjing-t',
      note: '已经有 2 人，缺 2 人凑双打。',
      members: [
        { userId: 'u_chenjing', name: '陈静', status: 'joined' },
        { userId: 'u_lina', name: '李娜', status: 'joined' },
      ],
      createdAt: dateStr(-1) + ' 21:05',
      status: 'open',
    },
  ];
}

function seedReports() {
  return [
    { id: 'r1', targetType: 'post', postId: 'p2', commentId: null, targetUserId: 'u_wangqiang', reporterId: 'u_chenjing', reason: '内容涉嫌广告推广', status: 'open', action: '', createdAt: dateStr(-1) + ' 09:12' },
  ];
}
