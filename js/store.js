const STORAGE_KEY = 'hzau-sports-proto-v1';

const Store = (function () {
  let data = null;

  function uid(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function blankState() {
    return {
      users: [], bookings: [], posts: [], notices: [], teams: [], reports: [],
      friendRequests: [], session: { userId: null },
    };
  }

  function buildSeed() {
    const s = blankState();
    s.users = clone(SEED_USERS);
    s.bookings = seedBookings();
    s.posts = clone(SEED_POSTS);
    s.notices = clone(SEED_NOTICES);
    s.teams = seedTeams();
    s.reports = seedReports();
    return s;
  }

  function load() {
    if (data) return data;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      data = raw ? JSON.parse(raw) : buildSeed();
    } catch (err) {
      data = buildSeed();
    }
    return data;
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(load()));
    } catch (err) {
      window.__storeSaveFailed = true;
    }
  }

  function reset() {
    data = buildSeed();
    save();
  }

  function userById(id) {
    return load().users.find((u) => u.id === id) || null;
  }

  function currentUser() {
    const s = load();
    return s.users.find((u) => u.id === s.session.userId) || null;
  }

  function setSession(userId) {
    load().session.userId = userId;
    save();
  }

  function canPost(user) {
    return !!user && user.role === 'student' && !user.muted && !user.banned;
  }

  function loginStudent(studentId, password) {
    const sid = String(studentId || '').trim();
    const pwd = String(password || '');
    if (!sid || !pwd) return { ok: false, message: '请输入学号和密码' };
    const user = load().users.find((u) => u.role === 'student' && u.studentId === sid);
    if (!user) return { ok: false, message: '该学号尚未注册，请先注册账号' };
    if (user.password !== pwd) return { ok: false, message: '密码错误，请重新输入' };
    setSession(user.id);
    return { ok: true };
  }

  function loginAdmin(account, password) {
    const acc = String(account || '').trim();
    const pwd = String(password || '');
    if (!acc || !pwd) return { ok: false, message: '请输入管理员账号和密码' };
    const user = load().users.find((u) => u.role === 'admin' && u.account === acc);
    if (!user) return { ok: false, message: '管理员账号不存在' };
    if (user.password !== pwd) return { ok: false, message: '管理员密码错误' };
    setSession(user.id);
    return { ok: true, needChangePassword: !!user.mustChangePassword };
  }

  function register(input) {
    const s = load();
    const name = String(input.name || '').trim();
    const sid = String(input.studentId || '').trim();
    const pwd = String(input.password || '');
    if (!name) return { ok: false, message: '请填写姓名' };
    if (!/^\d{6,20}$/.test(sid)) return { ok: false, message: '学号需为 6-20 位数字' };
    if (pwd.length < 6) return { ok: false, message: '密码至少 6 位' };
    if (s.users.some((u) => u.studentId === sid)) return { ok: false, message: '该学号已注册，请直接登录' };
    const user = {
      id: uid('u'), role: 'student', studentId: sid, password: pwd, name: name,
      gender: '', age: '', grade: '', major: '', className: '', hobbies: '', bio: '',
      avatar: '', createdAt: nowStamp(), banned: false, muted: false, friends: [],
    };
    s.users.push(user);
    s.session.userId = user.id;
    save();
    return { ok: true, user };
  }

  function logout() {
    load().session.userId = null;
    save();
  }

  function setPassword(newPassword) {
    const user = currentUser();
    if (!user) return { ok: false, message: '请先登录' };
    const pwd = String(newPassword || '');
    if (pwd.length < 6) return { ok: false, message: '新密码至少 6 位' };
    if (pwd === user.password) return { ok: false, message: '新密码不能与当前密码相同' };
    user.password = pwd;
    user.mustChangePassword = false;
    save();
    return { ok: true };
  }

  function updateProfile(patch) {
    const user = currentUser();
    if (!user) return { ok: false, message: '请先登录' };
    Object.keys(patch).forEach((key) => {
      if (key === 'id' || key === 'role' || key === 'password' || key === 'studentId') return;
      user[key] = patch[key];
    });
    save();
    return { ok: true };
  }

  function findActiveBooking(s, venueTypeId, venueNo, date, slot) {
    return s.bookings.find((b) => b.venueTypeId === venueTypeId && b.venueNo === venueNo
      && b.date === date && b.slot === slot && b.status !== 'rejected') || null;
  }

  function venueText(venueTypeId, venueNo) {
    const t = VENUE_MAP[venueTypeId];
    return t ? t.name + ' ' + t.prefix + venueNo : String(venueTypeId) + ' ' + venueNo;
  }

  function findUserSlotBooking(s, userId, date, slot, exceptTeamId) {
    if (!userId) return null;
    return s.bookings.find((b) => b.userId === userId && b.date === date
      && String(b.slot) === String(slot) && b.status !== 'rejected'
      && (!exceptTeamId || b.teamId !== exceptTeamId)) || null;
  }

  function slotConflictText(booking) {
    const slot = TIME_SLOTS.find((x) => x.id === Number(booking.slot));
    return venueText(booking.venueTypeId, booking.venueNo) + (slot ? ' ' + slot.label : '');
  }

  function compareBySlotTime(a, b) {
    const pa = isPastSlot(a.date, a.slot);
    const pb = isPastSlot(b.date, b.slot);
    if (pa !== pb) return pa ? 1 : -1;
    const ka = a.date + ':' + pad2(Number(a.slot));
    const kb = b.date + ':' + pad2(Number(b.slot));
    if (ka === kb) return (a.createdAt || '') < (b.createdAt || '') ? 1 : -1;
    return pa ? (ka < kb ? 1 : -1) : (ka < kb ? -1 : 1);
  }

  function slotStatus(venueTypeId, venueNo, date, slot) {
    const s = load();
    const found = findActiveBooking(s, venueTypeId, venueNo, date, slot);
    if (found) {
      if (found.userId === s.session.userId) return { state: 'mine', booking: found };
      return { state: found.status === 'pending' ? 'pending' : 'taken', booking: found };
    }
    const own = findUserSlotBooking(s, s.session.userId, date, slot);
    if (own) return { state: 'conflict', booking: own };
    return { state: 'free', booking: null };
  }

  function createBooking(input) {
    const s = load();
    const user = currentUser();
    if (!user) return { ok: false, message: '请先登录' };
    const type = VENUE_MAP[input.venueTypeId];
    if (!type) return { ok: false, message: '场地类型不存在' };
    const members = (input.members || []).map((m) => String(m || '').trim()).filter(Boolean);
    const reason = String(input.reason || '').trim();
    if (!reason) return { ok: false, message: '请填写预约理由' };
    const conflict = findActiveBooking(s, input.venueTypeId, input.venueNo, input.date, input.slot);
    if (conflict) return { ok: false, message: '该时段已被预约，请选择其他时段' };
    const clash = findUserSlotBooking(s, user.id, input.date, input.slot);
    if (clash) {
      return { ok: false, message: '你在该时段已预约了其他场馆（' + slotConflictText(clash) + '），需先取消该预约才能预约此处' };
    }
    const booking = {
      id: uid('b'), userId: user.id, venueTypeId: input.venueTypeId, venueNo: input.venueNo,
      date: input.date, slot: input.slot, reason: reason,
      members: members, status: 'pending', createdAt: nowStamp(),
      teamId: input.teamId || null, note: '',
    };
    s.bookings.push(booking);
    save();
    return { ok: true, booking: booking };
  }

  function bookingsOf(userId) {
    return load().bookings.filter((b) => b.userId === userId);
  }

  function purgeExpiredBookings() {
    const s = load();
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const kept = [];
    let removed = 0;
    s.bookings.forEach((b) => {
      const start = slotStartDate(b.date, b.slot);
      if (start && start.getTime() < cutoff) { removed += 1; return; }
      kept.push(b);
    });
    if (removed) {
      s.bookings = kept;
      save();
    }
    return { removed: removed };
  }

  function purgeExpiredTeams() {
    const s = load();
    const today = todayStr();
    const kept = s.teams.filter((t) => !(t.date < today));
    const removed = s.teams.length - kept.length;
    if (removed) {
      s.teams = kept;
      save();
    }
    return { removed: removed };
  }

  function cancelBooking(id) {
    const s = load();
    const user = currentUser();
    const booking = s.bookings.find((b) => b.id === id);
    if (!booking) return { ok: false, message: '预约不存在' };
    if (booking.userId !== user.id) return { ok: false, message: '只能取消自己的预约' };
    s.bookings = s.bookings.filter((b) => b.id !== id);
    s.teams.forEach((t) => { if (t.id === booking.teamId) t.status = 'open'; });
    save();
    return { ok: true };
  }

  function pendingBookings() {
    return load().bookings.filter((b) => b.status === 'pending').sort(compareBySlotTime);
  }

  function reviewBooking(id, status) {
    const booking = load().bookings.find((b) => b.id === id);
    if (!booking) return { ok: false, message: '预约不存在' };
    if (isPastSlot(booking.date, booking.slot)) return { ok: false, message: '该预约的活动时间已过，不能再审核' };
    booking.status = status;
    booking.reviewedAt = nowStamp();
    save();
    return { ok: true };
  }
  function posts() {
    return load().posts.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  function createPost(content) {
    const s = load();
    const user = currentUser();
    if (!canPost(user)) return { ok: false, message: '当前账号无法发布内容' };
    const text = String(content || '').trim();
    if (!text) return { ok: false, message: '请输入帖子内容' };
    const post = { id: uid('p'), userId: user.id, content: text, createdAt: nowStamp(), likes: [], favorites: [], comments: [] };
    s.posts.unshift(post);
    save();
    return { ok: true, post: post };
  }

  function addComment(postId, content) {
    const s = load();
    const user = currentUser();
    if (!canPost(user)) return { ok: false, message: '当前账号无法评论' };
    const post = s.posts.find((p) => p.id === postId);
    if (!post) return { ok: false, message: '帖子不存在' };
    const text = String(content || '').trim();
    if (!text) return { ok: false, message: '请输入评论内容' };
    post.comments.push({ id: uid('c'), userId: user.id, content: text, createdAt: nowStamp() });
    save();
    return { ok: true };
  }

  function toggleLike(postId) {
    const s = load();
    const user = currentUser();
    const post = s.posts.find((p) => p.id === postId);
    if (!post || !user) return { ok: false };
    const i = post.likes.indexOf(user.id);
    if (i >= 0) post.likes.splice(i, 1); else post.likes.push(user.id);
    save();
    return { ok: true, liked: i < 0 };
  }

  function toggleFavorite(postId) {
    const s = load();
    const user = currentUser();
    const post = s.posts.find((p) => p.id === postId);
    if (!post || !user) return { ok: false };
    const i = post.favorites.indexOf(user.id);
    if (i >= 0) post.favorites.splice(i, 1); else post.favorites.push(user.id);
    save();
    return { ok: true, saved: i < 0 };
  }

  function report(input) {
    const s = load();
    const user = currentUser();
    if (!user) return { ok: false, message: '请先登录' };
    const reason = String(input.reason || '').trim();
    if (!reason) return { ok: false, message: '请填写举报理由' };
    const dup = s.reports.find((r) => r.reporterId === user.id && r.postId === (input.postId || null)
      && r.commentId === (input.commentId || null) && r.targetUserId === input.targetUserId);
    if (dup) return { ok: false, message: '你已举报过该内容，管理员正在处理' };
    s.reports.unshift({
      id: uid('r'), targetType: input.targetType, postId: input.postId || null,
      commentId: input.commentId || null, targetUserId: input.targetUserId,
      reporterId: user.id, reason: reason, status: 'open', action: '', createdAt: nowStamp(),
    });
    save();
    return { ok: true };
  }

  function resolveReport(id, action) {
    const s = load();
    const item = s.reports.find((r) => r.id === id);
    if (!item) return { ok: false, message: '举报记录不存在' };
    const target = userById(item.targetUserId);
    item.status = 'resolved';
    item.action = action;
    item.resolvedAt = nowStamp();
    if (target) {
      if (action === 'mute') target.muted = true;
      if (action === 'ban') { target.banned = true; target.muted = true; }
      if (action === 'unmute') { target.muted = false; target.banned = false; }
    }
    if (action === 'remove-content' && item.postId) {
      s.posts = s.posts.filter((p) => p.id !== item.postId);
    }
    save();
    return { ok: true };
  }

  function friendRequestsFor(userId) {
    return load().friendRequests.filter((r) => r.toId === userId && r.status === 'pending');
  }

  function sentFriendRequests(userId) {
    return load().friendRequests.filter((r) => r.fromId === userId);
  }

  function isFriend(a, b) {
    const ua = userById(a);
    return !!ua && (ua.friends || []).indexOf(b) >= 0;
  }

  function sendFriendRequest(targetId) {
    const s = load();
    const user = currentUser();
    if (!canPost(user)) return { ok: false, message: '当前账号无法添加好友' };
    if (targetId === user.id) return { ok: false, message: '不能添加自己为好友' };
    if (isFriend(user.id, targetId)) return { ok: false, message: '你们已经是好友了' };
    const pending = s.friendRequests.find((r) => r.fromId === user.id && r.toId === targetId && r.status === 'pending');
    if (pending) return { ok: false, message: '已发送过好友申请，等待对方同意' };
    s.friendRequests.push({ id: uid('f'), fromId: user.id, toId: targetId, status: 'pending', createdAt: nowStamp() });
    save();
    return { ok: true, message: '好友申请已发送' };
  }

  function respondFriendRequest(id, accept) {
    const s = load();
    const user = currentUser();
    const req = s.friendRequests.find((r) => r.id === id);
    if (!req || !user || req.toId !== user.id) return { ok: false, message: '申请不存在' };
    req.status = accept ? 'accepted' : 'rejected';
    req.resolvedAt = nowStamp();
    if (accept) {
      const from = userById(req.fromId);
      if (from && (from.friends || []).indexOf(user.id) < 0) from.friends.push(user.id);
      if ((user.friends || []).indexOf(req.fromId) < 0) user.friends.push(req.fromId);
    }
    save();
    return { ok: true };
  }

  function teams() {
    return load().teams.slice().sort(compareBySlotTime);
  }

  function createTeam(input) {
    const s = load();
    const user = currentUser();
    if (!user) return { ok: false, message: '请先登录' };
    const type = VENUE_MAP[input.venueTypeId];
    const title = String(input.title || '').trim();
    if (!type) return { ok: false, message: '请选择场馆类型' };
    if (!title) return { ok: false, message: '请填写队伍标题' };
    const need = Number(input.need) || Math.max(2, type.capacity);
    if (!(need >= 2)) {
      return { ok: false, message: '需要人数至少 2 人' };
    }
    const ownSlot = findUserSlotBooking(s, user.id, input.date, Number(input.slot));
    if (ownSlot) {
      return { ok: false, message: '你在该时段已预约了其他场馆（' + slotConflictText(ownSlot) + '），需先取消该预约才能发起组队' };
    }
    const team = {
      id: uid('t'), userId: user.id, venueTypeId: input.venueTypeId, venueNo: input.venueNo,
      date: input.date, slot: Number(input.slot), need: need, title: title,
      contact: String(input.contact || '').trim(), note: String(input.note || '').trim(),
      members: [{ userId: user.id, name: user.name, status: 'joined' }],
      createdAt: nowStamp(), status: 'open',
    };
    s.teams.unshift(team);
    save();
    return { ok: true, team: team };
  }

  function applyTeam(teamId, note) {
    const s = load();
    const user = currentUser();
    if (!user) return { ok: false, message: '请先登录' };
    const team = s.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, message: '队伍不存在' };
    if (isPastSlot(team.date, team.slot)) return { ok: false, message: '该组队活动时间已过，不能再操作' };
    if (team.userId === user.id) return { ok: false, message: '你是该队伍的发起人' };
    const exist = team.members.find((m) => m.userId === user.id);
    if (exist) return { ok: false, message: exist.status === 'pending' ? '已提交申请，等待队长同意' : '你已在队伍中' };
    if (team.members.filter((m) => m.status === 'joined').length >= team.need) {
      return { ok: false, message: '队伍人数已满' };
    }
    const ownSlot = findUserSlotBooking(s, user.id, team.date, team.slot);
    if (ownSlot) {
      return { ok: false, message: '你在该时段已预约了其他场馆（' + slotConflictText(ownSlot) + '），需先取消该预约才能加入队伍' };
    }
    team.members.push({ userId: user.id, name: user.name, status: 'pending', note: String(note || '').trim() });
    save();
    return { ok: true, message: '入队申请已发送，等待队长同意' };
  }

  function reviewTeamMember(teamId, userId, approve) {
    const s = load();
    const team = s.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, message: '队伍不存在' };
    if (isPastSlot(team.date, team.slot)) return { ok: false, message: '该组队活动时间已过，不能再操作' };
    const member = team.members.find((m) => m.userId === userId);
    if (!member) return { ok: false, message: '成员不存在' };
    if (approve) {
      const ownSlot = findUserSlotBooking(s, userId, team.date, team.slot);
      if (ownSlot) {
        return { ok: false, message: '该同学在该时段已预约其他场馆（' + slotConflictText(ownSlot) + '），需其先取消后才能同意入队' };
      }
      member.status = 'joined';
      if (team.members.filter((m) => m.status === 'joined').length >= team.need) team.status = 'full';
    } else {
      team.members = team.members.filter((m) => m.userId !== userId);
    }
    save();
    return { ok: true };
  }

  function leaveTeam(teamId) {
    const s = load();
    const user = currentUser();
    if (!user) return { ok: false, message: '请先登录' };
    const team = s.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, message: '队伍不存在' };
    if (isPastSlot(team.date, team.slot)) return { ok: false, message: '该组队活动时间已过，不能再操作' };
    if (team.userId === user.id) return { ok: false, message: '你是该队伍的发起人，不能退出自己的队伍' };
    const member = team.members.find((m) => m.userId === user.id);
    if (!member) return { ok: false, message: '你不在该队伍中' };
    if (member.status !== 'joined') return { ok: false, message: '入队申请尚未通过，暂时不能退出' };
    if (team.status === 'booked') return { ok: false, message: '队伍已提交预约，需队长取消预约后才能退出' };
    team.members = team.members.filter((m) => m.userId !== user.id);
    if (team.status === 'full') team.status = 'open';
    save();
    return { ok: true, message: '已退出队伍' };
  }

  function confirmTeamBooking(teamId) {
    const s = load();
    const team = s.teams.find((t) => t.id === teamId);
    if (!team) return { ok: false, message: '队伍不存在' };
    if (isPastSlot(team.date, team.slot)) return { ok: false, message: '该组队活动时间已过，不能再操作' };
    const joined = team.members.filter((m) => m.status === 'joined');
    if (joined.length < team.need) {
      return { ok: false, message: '队伍人数未满（' + joined.length + '/' + team.need + '），暂不能预约场地' };
    }
    const user = currentUser();
    if (!user || user.id !== team.userId) return { ok: false, message: '只有队长可以提交预约' };
    const result = createBookingForTeam(team, joined.map((m) => m.name));
    if (result.ok) {
      team.status = 'booked';
      save();
    }
    return result;
  }

  function createBookingForTeam(team, memberNames) {
    const s = load();
    const conflict = findActiveBooking(s, team.venueTypeId, team.venueNo, team.date, team.slot);
    if (conflict) return { ok: false, message: '该时段已被预约，请重新组队另选时段' };
    const ownSlot = findUserSlotBooking(s, team.userId, team.date, team.slot, team.id);
    if (ownSlot) {
      return { ok: false, message: '队长在该时段已预约了其他场馆（' + slotConflictText(ownSlot) + '），需先取消该预约才能提交组队预约' };
    }
    const members = memberNames.slice();
    s.bookings.push({
      id: uid('b'), userId: team.userId, venueTypeId: team.venueTypeId, venueNo: team.venueNo,
      date: team.date, slot: team.slot, members: members,
      reason: '组队预约：' + (team.title || '组队打球'),
      status: 'pending', createdAt: nowStamp(), teamId: team.id, note: '由组队生成',
    });
    save();
    return { ok: true, message: '已提交预约，等待管理员审核' };
  }

  function notices() {
    return load().notices.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  function publishNotice(title, content) {
    const s = load();
    const t = String(title || '').trim();
    const c = String(content || '').trim();
    if (!t || !c) return { ok: false, message: '请填写通知标题和内容' };
    s.notices.unshift({ id: uid('n'), title: t, content: c, createdAt: nowStamp(), by: '系统管理员' });
    save();
    return { ok: true };
  }

  function deleteNotice(id) {
    const s = load();
    s.notices = s.notices.filter((n) => n.id !== id);
    save();
    return { ok: true };
  }

  function allUsers() {
    return load().users.filter((u) => u.role === 'student');
  }

  function stats() {
    const s = load();
    const byType = VENUE_TYPES.map((t) => ({
      id: t.id, name: t.name, icon: t.icon,
      count: s.bookings.filter((b) => b.venueTypeId === t.id && b.status !== 'rejected').length,
    })).sort((a, b) => b.count - a.count);
    return {
      users: s.users.filter((u) => u.role === 'student').length,
      bookings: s.bookings.filter((b) => b.status !== 'rejected').length,
      pending: s.bookings.filter((b) => b.status === 'pending').length,
      approved: s.bookings.filter((b) => b.status === 'approved').length,
      posts: s.posts.length,
      teams: s.teams.length,
      openReports: s.reports.filter((r) => r.status === 'open').length,
      byType: byType,
    };
  }

  return {
    load: load, save: save, reset: reset,
    userById: userById, currentUser: currentUser, allUsers: allUsers, canPost: canPost,
    loginStudent: loginStudent, loginAdmin: loginAdmin, register: register, logout: logout,
    setPassword: setPassword, updateProfile: updateProfile,
    slotStatus: slotStatus, createBooking: createBooking, bookingsOf: bookingsOf,
    purgeExpiredBookings: purgeExpiredBookings, purgeExpiredTeams: purgeExpiredTeams,
    cancelBooking: cancelBooking, pendingBookings: pendingBookings, reviewBooking: reviewBooking,
    posts: posts, createPost: createPost, addComment: addComment, toggleLike: toggleLike, toggleFavorite: toggleFavorite,
    report: report, reports: function () { return load().reports.slice(); }, resolveReport: resolveReport,
    friendRequestsFor: friendRequestsFor, sentFriendRequests: sentFriendRequests, isFriend: isFriend,
    sendFriendRequest: sendFriendRequest, respondFriendRequest: respondFriendRequest,
    teams: teams, createTeam: createTeam, applyTeam: applyTeam, reviewTeamMember: reviewTeamMember,
    leaveTeam: leaveTeam,
    confirmTeamBooking: confirmTeamBooking, notices: notices, publishNotice: publishNotice,
    deleteNotice: deleteNotice, stats: stats,
  };
})();
