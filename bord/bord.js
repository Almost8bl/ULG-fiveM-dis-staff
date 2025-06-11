// bord.js

// استدعاء db من ملف firebase.js
import { db } from './firebase.js';

// استدعاء دوال Firestore اللازمة
import {
    collection,
    query,
    where,
    getDocs,
    onSnapshot, // مهم جداً للـ Realtime Updates
    addDoc,
    updateDoc,
    deleteDoc,
    doc
} from "firebase/firestore";

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
    // البيانات دي هتتحمل من Firestore مش من localStorage
    let state = {
        currentUser: JSON.parse(sessionStorage.getItem('currentUser')),
        allAdmins: [],
        tasks: [],
        notifications: [],
        auditLog: [],
    };

    // --- دالة للحفظ في Session Storage (للكرنت يوزر فقط) ---
    const saveToSessionStorage = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));

    // --- دالة تسجيل الأحداث في Firestore ---
    const logAction = async (actionMessage, user = state.currentUser) => {
        if (!user) return;
        try {
            await addDoc(collection(db, "auditLogs"), {
                timestamp: new Date().toISOString(),
                userName: user.name,
                userRole: user.role,
                action: actionMessage
            });
            console.log("Log action recorded successfully!");
        } catch (e) {
            console.error("Error adding audit log: ", e);
        }
    };

    // --- نظام الدخول والخروج ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('login-name').value.trim();
        const loginError = document.getElementById('login-error');
        loginError.textContent = '';

        let userToLogin = null;

        if (name.toLowerCase() === 'future') {
            userToLogin = { id: 'FUTURE01', name: 'FUTURE', role: 'المبرمج', roleLevel: ROLES.FUTURE, banned: false };
        } else {
            // البحث عن المستخدم في Firestore
            const q = query(collection(db, "admins"), where("name", "==", name));
            try {
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const userData = querySnapshot.docs[0].data();
                    userToLogin = { ...userData, id: querySnapshot.docs[0].id }; // إضافة ID المستند
                }
            } catch (error) {
                console.error("Error fetching admin:", error);
                loginError.textContent = "حدث خطأ أثناء البحث عن المستخدم.";
                return;
            }
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
        await logAction("تم تسجيل الدخول");
        init();
    });

    logoutBtn.addEventListener('click', async () => {
        await logAction("تم تسجيل الخروج");
        sessionStorage.removeItem('currentUser');
        state.currentUser = null;
        window.location.reload();
    });

    // --- تطبيق الصلاحيات على الواجهة ---
    const applyPermissions = () => {
        if (!state.currentUser) return;

        const level = state.currentUser.roleLevel;
        const isFuture = level === ROLES.FUTURE;

        document.querySelector('.nav-item[data-section="members"]').classList.toggle('hidden', !isFuture && level < ROLES["Head Moderator"]);
        document.querySelector('.nav-item[data-section="log"]').classList.toggle('hidden', !isFuture && level < ROLES["Discord Manager"]);
        document.getElementById('nav-database').classList.toggle('hidden', !isFuture);
        document.getElementById('send-notification-wrapper').classList.toggle('hidden', !isFuture && level < ROLES["Vice Manager"]);
        document.getElementById('addTaskBtn').classList.toggle('hidden', !isFuture && level < ROLES["Head Moderator"]);
        document.getElementById('clear-data-wrapper').classList.toggle('hidden', !isFuture && level < ROLES["Discord Manager"]);

        renderTasks();
        renderNotifications();
    };

    // --- قسم قاعدة البيانات (للمبرمج فقط) ---
    const setupDatabaseSection = () => {
        const createUserForm = document.getElementById('create-user-form');
        const userManagementList = document.getElementById('user-management-list');

        // Note: renderUserList is called from setupFirestoreListeners for real-time updates.
        // It's removed here to avoid duplication as onSnapshot handles it.

        createUserForm.addEventListener('submit', async e => {
            e.preventDefault();
            const nameInput = document.getElementById('new-user-name');
            const roleSelect = document.getElementById('new-user-role');
            const name = nameInput.value.trim();
            const role = roleSelect.value;
            const roleLevel = ROLES[role];

            const q = query(collection(db, "admins"), where("name", "==", name));
            const querySnapshot = await getDocs(q);

            if (name && querySnapshot.empty) {
                const newUser = {
                    name,
                    role,
                    roleLevel,
                    banned: false,
                    ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`
                };
                try {
                    await addDoc(collection(db, "admins"), newUser);
                    await logAction(`أنشأ مستخدمًا جديدًا: ${name} برتبة ${role}`);
                    nameInput.value = '';
                } catch (e) {
                    console.error("Error adding document: ", e);
                    alert("حدث خطأ عند إضافة المستخدم.");
                }
            } else {
                alert('اسم المستخدم موجود بالفعل أو غير صالح.');
            }
        });

        userManagementList.addEventListener('click', async e => {
            const userId = e.target.dataset.id;
            if (!userId) return;

            if (e.target.classList.contains('delete-user-btn')) {
                if (confirm('هل أنت متأكد من حذف هذا المستخدم نهائيًا؟')) {
                    const userName = state.allAdmins.find(u => u.id == userId)?.name;
                    try {
                        await deleteDoc(doc(db, "admins", userId));
                        await logAction(`حذف المستخدم: ${userName}`);
                    } catch (e) {
                        console.error("Error deleting document: ", e);
                        alert("حدث خطأ عند حذف المستخدم.");
                    }
                }
            } else if (e.target.classList.contains('ban-btn')) {
                const user = state.allAdmins.find(u => u.id == userId);
                if (user) {
                    try {
                        await updateDoc(doc(db, "admins", userId), { banned: !user.banned });
                        await logAction(`${user.banned ? 'فك حظر' : 'حظر'} المستخدم: ${user.name}`);
                    } catch (e) {
                        console.error("Error updating document: ", e);
                        alert("حدث خطأ عند تحديث حالة الحظر.");
                    }
                }
            }
        });
    };

    // --- دوال العرض الرئيسية ---
    const renderDashboard = () => {
        document.getElementById('total-tasks-count').textContent = state.tasks.length;
        document.getElementById('total-notifications-count').textContent = state.notifications.length;
        document.getElementById('total-members-count').textContent = state.allAdmins.length;
    };

    const renderTasks = () => {
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = state.tasks.length === 0 ? '<li class="task-item">لا توجد مهام.</li>' : '';
        state.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.dataset.id = task.id;
            const canDelete = state.currentUser && state.currentUser.roleLevel >= ROLES["Discord Manager"];
            li.innerHTML = `<div><h4>${task.title}</h4><p>${task.description || ''}</p></div>
                             ${canDelete ? `<div class="task-actions"><button class="delete-btn" title="حذف">🗑️</button></div>` : ''}`;
            taskList.appendChild(li);
        });

        taskList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const taskId = e.target.closest('.task-item').dataset.id;
                if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
                    try {
                        await deleteDoc(doc(db, "tasks", taskId));
                        await logAction(`حذف مهمة`);
                    } catch (e) {
                        console.error("Error deleting task:", e);
                        alert("حدث خطأ عند حذف المهمة.");
                    }
                }
            };
        });
    };

    const renderNotifications = () => {
        const notifList = document.getElementById('notification-list');
        notifList.innerHTML = '';
        state.notifications.slice().reverse().forEach(notif => {
            const li = document.createElement('li');
            li.className = 'notification-item';
            const canDelete = state.currentUser && state.currentUser.roleLevel >= ROLES["Discord Manager"];
            li.innerHTML = `<div><p>${notif.message}</p><small>بواسطة: ${notif.author}</small></div>
                             ${canDelete ? `<div class="notification-actions"><button class="delete-btn" data-id="${notif.id}">🗑️</button></div>` : ''}`;
            notifList.appendChild(li);
        });

        notifList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async (e) => {
                const notifId = e.target.dataset.id;
                if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
                    try {
                        await deleteDoc(doc(db, "notifications", notifId));
                        await logAction(`حذف إشعار`);
                    } catch (e) {
                        console.error("Error deleting notification:", e);
                        alert("حدث خطأ عند حذف الإشعار.");
                    }
                }
            };
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
        if (state.currentUser && state.currentUser.roleLevel < ROLES["Discord Manager"]) return;
        state.auditLog.slice().reverse().forEach(log => {
            const li = document.createElement('li');
            li.className = 'log-item';
            li.innerHTML = `<div>${new Date(log.timestamp).toLocaleString('ar-EG')} - [${log.userName || log.user}]</div><div>${log.action}</div>`;
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

        // مثال لإضافة مهام وإشعارات (افترض وجود فورم في الـ HTML)
        const addTaskForm = document.getElementById('add-task-form');
        if (addTaskForm) {
            addTaskForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('task-title').value.trim();
                const description = document.getElementById('task-description').value.trim();
                if (title) {
                    try {
                        await addDoc(collection(db, "tasks"), {
                            title,
                            description,
                            createdAt: new Date().toISOString(),
                            author: state.currentUser ? state.currentUser.name : 'Unknown'
                        });
                        await logAction(`أضاف مهمة جديدة: ${title}`);
                        addTaskForm.reset();
                    } catch (e) {
                        console.error("Error adding task:", e);
                        alert("حدث خطأ عند إضافة المهمة.");
                    }
                }
            });
        }

        const sendNotificationForm = document.getElementById('send-notification-form');
        if (sendNotificationForm) {
            sendNotificationForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const message = document.getElementById('notification-message').value.trim();
                if (message) {
                    try {
                        await addDoc(collection(db, "notifications"), {
                            message,
                            createdAt: new Date().toISOString(),
                            author: state.currentUser ? state.currentUser.name : 'Unknown'
                        });
                        await logAction(`أرسل إشعار جديد`);
                        sendNotificationForm.reset();
                    } catch (e) {
                        console.error("Error sending notification:", e);
                        alert("حدث خطأ عند إرسال الإشعار.");
                    }
                }
            });
        }

        const clearDataBtn = document.getElementById('clear-all-data-btn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', async () => {
                if (state.currentUser && state.currentUser.roleLevel >= ROLES["Discord Manager"]) {
                    if (confirm('هل أنت متأكد من مسح جميع بيانات المهام والإشعارات وسجل المراجعة؟ لا يمكن التراجع عن هذا الإجراء!')) {
                        const collectionsToClear = ['tasks', 'notifications', 'auditLogs'];
                        for (const colName of collectionsToClear) {
                            try {
                                const q = query(collection(db, colName));
                                const querySnapshot = await getDocs(q);
                                const deletePromises = [];
                                querySnapshot.forEach((docItem) => {
                                    deletePromises.push(deleteDoc(doc(db, colName, docItem.id)));
                                });
                                await Promise.all(deletePromises);
                                console.log(`Collection ${colName} cleared.`);
                                await logAction(`مسح جميع بيانات ${colName}`);
                            } catch (e) {
                                console.error(`Error clearing collection ${colName}:`, e);
                                alert(`حدث خطأ عند مسح بيانات ${colName}.`);
                            }
                        }
                    }
                } else {
                    alert('ليس لديك الصلاحية لمسح البيانات.');
                }
            });
        }
    }

    // --- إعداد الـ Firestore Listeners (مهم جداً للـ Realtime) ---
    const setupFirestoreListeners = () => {
        onSnapshot(collection(db, "admins"), (snapshot) => {
            state.allAdmins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderMembers();
            renderDashboard();
            if (state.currentUser && state.currentUser.roleLevel === ROLES.FUTURE) {
                const userManagementList = document.getElementById('user-management-list');
                if (userManagementList) {
                    userManagementList.innerHTML = ''; // Clear existing list before re-rendering
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
                }
            }
        });

        onSnapshot(collection(db, "tasks"), (snapshot) => {
            state.tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTasks();
            renderDashboard();
        });

        onSnapshot(collection(db, "notifications"), (snapshot) => {
            state.notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNotifications();
            renderDashboard();
        });

        onSnapshot(collection(db, "auditLogs"), (snapshot) => {
            state.auditLog = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAuditLog();
        });
    };

    // --- دالة التشغيل الرئيسية ---
    const init = () => {
        if (state.currentUser) {
            loginPage.classList.add('hidden');
            dashboardWrapper.classList.remove('hidden');
            document.getElementById('welcome-message').textContent = `أهلاً بك، ${state.currentUser.name}`;

            applyPermissions();
            setupEventListeners();
            setupFirestoreListeners(); // بدء الاستماع لـ Firestore

            if (state.currentUser.roleLevel === ROLES.FUTURE) {
                setupDatabaseSection(); // فقط إذا كان المستخدم "FUTURE"
            }

        } else {
            loginPage.classList.remove('hidden');
            dashboardWrapper.classList.add('hidden');
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelector('.nav-item.active')?.classList.remove('active');
        }
    };

    init();
});
