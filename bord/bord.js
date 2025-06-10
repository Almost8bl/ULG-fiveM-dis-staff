document.addEventListener('DOMContentLoaded', () => {
    // --- تعريف العناصر الأساسية ---
    const loginPage = document.getElementById('login-page');
    const dashboardWrapper = document.getElementById('dashboard-wrapper');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    // --- تعريف الرتب ومستويات الصلاحية ---
    const ROLES = {
        "FUTURE": 7, // المبرمج
        "Discord Manager": 6,
        "Vice Manager": 5,
        "Head Moderator": 4,
        "Supervisor": 3,
        "Senior Moderator": 2,
        "Moderator": 1
    };

    // --- إدارة الحالة (State Management) ---
    let state = {
        currentUser: JSON.parse(sessionStorage.getItem('currentUser')),
        allAdmins: JSON.parse(localStorage.getItem('allAdmins')) || [],
        tasks: JSON.parse(localStorage.getItem('tasks')) || [],
        notifications: JSON.parse(localStorage.getItem('notifications')) || [],
        auditLog: JSON.parse(localStorage.getItem('auditLog')) || [],
    };
    
    // --- دوال الحفظ ---
    const saveToLocalStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const saveToSessionStorage = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
    
    // --- دالة تسجيل الأحداث ---
    const logAction = (actionMessage, user = state.currentUser) => {
        if (!user) return;
        state.auditLog.push({
            timestamp: new Date().toISOString(), user: user.name, role: user.role, action: actionMessage
        });
        saveToLocalStorage('auditLog', state.auditLog);
        if (state.currentUser?.roleLevel === ROLES.FUTURE) renderAuditLog();
    };

    // --- نظام الدخول والخروج ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('login-name').value.trim();
        const loginError = document.getElementById('login-error');
        loginError.textContent = ''; // مسح الخطأ السابق

        let userToLogin = null;

        if (name.toLowerCase() === 'future') {
            userToLogin = { id: 'FUTURE01', name: 'FUTURE', role: 'المبرمج', roleLevel: ROLES.FUTURE, banned: false };
        } else {
            userToLogin = state.allAdmins.find(admin => admin.name.toLowerCase() === name.toLowerCase());
        }

        if (!userToLogin) {
            loginError.textContent = "اسم المستخدم غير موجود.";
            return;
        }

        if (userToLogin.banned) {
            loginError.textContent = "هذا الحساب محظور ولا يمكنه الدخول.";
            return;
        }
        
        state.currentUser = userToLogin;
        saveToSessionStorage('currentUser', state.currentUser);
        logAction("تم تسجيل الدخول");
        init();
    });

    logoutBtn.addEventListener('click', () => {
        logAction("تم تسجيل الخروج");
        sessionStorage.removeItem('currentUser');
        state.currentUser = null;
        window.location.reload();
    });

    // --- تطبيق الصلاحيات على الواجهة ---
    const applyPermissions = () => {
        const level = state.currentUser.roleLevel;
        const isFuture = level === ROLES.FUTURE;

        document.querySelector('.nav-item[data-section="members"]').classList.toggle('hidden', !isFuture && level < ROLES["Head Moderator"]);
        document.querySelector('.nav-item[data-section="log"]').classList.toggle('hidden', !isFuture && level < ROLES["Discord Manager"]);
        document.getElementById('nav-database').classList.toggle('hidden', !isFuture);
        document.getElementById('send-notification-wrapper').classList.toggle('hidden', !isFuture && level < ROLES["Vice Manager"]);
        document.getElementById('addTaskBtn').classList.toggle('hidden', !isFuture && level < ROLES["Head Moderator"]);
        document.getElementById('clear-data-wrapper').classList.toggle('hidden', !isFuture && level < ROLES["Discord Manager"]);
        
        // إعادة عرض المكونات لتطبيق الصلاحيات الداخلية (مثل أزرار الحذف)
        renderTasks();
        renderNotifications();
    };

    // --- قسم قاعدة البيانات (للمبرمج فقط) ---
    const setupDatabaseSection = () => {
        const createUserForm = document.getElementById('create-user-form');
        const userManagementList = document.getElementById('user-management-list');

        const renderUserList = () => {
            userManagementList.innerHTML = '';
            state.allAdmins.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'user-entry';
                userDiv.innerHTML = `
                    <div class="user-info">
                        <span class="${user.banned ? 'banned' : ''}">${user.name}</span>
                        <small>(${user.role})</small>
                    </div>
                    <div class="user-actions">
                        <button class="btn ${user.banned ? 'primary-btn' : 'danger-btn'} ban-btn" data-id="${user.id}">${user.banned ? 'فك الحظر' : 'حظر'}</button>
                        <button class="btn danger-btn delete-user-btn" data-id="${user.id}">حذف</button>
                    </div>`;
                userManagementList.appendChild(userDiv);
            });
        };

        createUserForm.addEventListener('submit', e => {
            e.preventDefault();
            const nameInput = document.getElementById('new-user-name');
            const roleSelect = document.getElementById('new-user-role');
            const name = nameInput.value.trim();
            const role = roleSelect.value;

            if (name && !state.allAdmins.some(u => u.name.toLowerCase() === name.toLowerCase())) {
                const newUser = {
                    id: Date.now(), name, role, roleLevel: ROLES[role], banned: false, ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`
                };
                state.allAdmins.push(newUser);
                saveToLocalStorage('allAdmins', state.allAdmins);
                logAction(`أنشأ مستخدمًا جديدًا: ${name} برتبة ${role}`);
                renderUserList();
                nameInput.value = '';
            } else {
                alert('اسم المستخدم موجود بالفعل أو غير صالح.');
            }
        });

        userManagementList.addEventListener('click', e => {
            const userId = e.target.dataset.id;
            if (!userId) return;

            if (e.target.classList.contains('delete-user-btn')) {
                if (confirm('هل أنت متأكد من حذف هذا المستخدم نهائيًا؟')) {
                    const userName = state.allAdmins.find(u=>u.id==userId).name;
                    state.allAdmins = state.allAdmins.filter(u => u.id != userId);
                    saveToLocalStorage('allAdmins', state.allAdmins);
                    logAction(`حذف المستخدم: ${userName}`);
                    renderUserList();
                }
            } else if (e.target.classList.contains('ban-btn')) {
                const user = state.allAdmins.find(u => u.id == userId);
                user.banned = !user.banned;
                saveToLocalStorage('allAdmins', state.allAdmins);
                logAction(`${user.banned ? 'حظر' : 'فك حظر'} المستخدم: ${user.name}`);
                renderUserList();
            }
        });

        renderUserList();
    };
    
    // --- دوال العرض الرئيسية ---
    const renderDashboard = () => {
        document.getElementById('total-tasks-count').textContent = state.tasks.length;
        document.getElementById('total-notifications-count').textContent = state.notifications.length;
        document.getElementById('total-members-count').textContent = state.allAdmins.length;
        // ... باقي إحصائيات لوحة التحكم
    };
    
    const renderTasks = () => {
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = state.tasks.length === 0 ? '<li class="task-item">لا توجد مهام.</li>' : '';
        state.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.dataset.id = task.id;
            // زر الحذف يظهر للمدير والمبرمج فقط
            const canDelete = state.currentUser.roleLevel >= ROLES["Discord Manager"];
            li.innerHTML = `<div><h4>${task.title}</h4><p>${task.description || ''}</p></div>
                            ${canDelete ? `<div class="task-actions"><button class="delete-btn" title="حذف">🗑️</button></div>` : ''}`;
            taskList.appendChild(li);
        });
    };

    const renderNotifications = () => {
        const notifList = document.getElementById('notification-list');
        notifList.innerHTML = '';
        state.notifications.slice().reverse().forEach(notif => {
            const li = document.createElement('li');
            li.className = 'notification-item';
            const canDelete = state.currentUser.roleLevel >= ROLES["Discord Manager"];
            li.innerHTML = `<div><p>${notif.message}</p><small>بواسطة: ${notif.author}</small></div>
                            ${canDelete ? `<div class="notification-actions"><button class="delete-btn" data-id="${notif.id}">🗑️</button></div>` : ''}`;
            notifList.appendChild(li);
        });
    };

    const renderMembers = () => {
        const membersList = document.getElementById('members-list');
        membersList.innerHTML = '';
        state.allAdmins.forEach(admin => {
            const div = document.createElement('div');
            div.className = 'member-card';
            div.innerHTML = `<h3>${admin.name}</h3><p>${admin.role}</p><p class="${admin.banned ? 'banned' : ''}">${admin.banned ? 'محظور' : 'نشط'}</p>`;
            membersList.appendChild(div);
        });
    };

    const renderAuditLog = () => {
        const logList = document.getElementById('log-list');
        logList.innerHTML = '';
        if (state.currentUser.roleLevel < ROLES["Discord Manager"]) return;
        state.auditLog.slice().reverse().forEach(log => {
            const li = document.createElement('li');
            li.className = 'log-item';
            li.innerHTML = `<div>${new Date(log.timestamp).toLocaleString('ar-EG')} - [${log.user}]</div><div>${log.action}</div>`;
            logList.appendChild(li);
        });
    };

    // --- ربط الأحداث الرئيسية ---
    function setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelector('.nav-item.active')?.classList.remove('active');
                document.querySelector('.content-section.active')?.classList.remove('active');
                e.currentTarget.classList.add('active');
                document.getElementById(e.currentTarget.dataset.section).classList.add('active');
            });
        });
    }

    // --- دالة التشغيل الرئيسية ---
    const init = () => {
        if (state.currentUser) {
            loginPage.classList.add('hidden');
            dashboardWrapper.classList.remove('hidden');
            document.getElementById('welcome-message').textContent = `أهلاً بك، ${state.currentUser.name}`;
            
            // استدعاء دوال العرض
            renderDashboard();
            renderMembers();
            renderAuditLog();
            
            applyPermissions();
            setupEventListeners();
            
            // استدعاء خاص لقسم قاعدة البيانات إذا كان المبرمج هو المستخدم
            if (state.currentUser.roleLevel === ROLES.FUTURE) {
                setupDatabaseSection();
            }

        } else {
            loginPage.classList.remove('hidden');
            dashboardWrapper.classList.add('hidden');
        }
    };
    
    init(); // تشغيل التطبيق
});