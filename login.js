// =================================================================
// 1. إعدادات الربط مع Firebase
// =================================================================
// TODO: ضع هنا إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();


// =================================================================
// 2. نظام الأمان ومنع الاختراق
// =================================================================

/**
 * دالة لتنقية المدخلات لمنع هجمات XSS.
 * تقوم بإزالة أي شيفرات HTML قد تكون ضارة.
 * @param {string} str - النص المدخل من المستخدم.
 * @returns {string} - النص بعد التنقية.
 */
function sanitizeInput(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// =================================================================
// 3. التعامل مع نموذج تسجيل الدخول
// =================================================================

const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // منع الإرسال التلقائي للنموذج

    // الحصول على البيانات من النموذج
    let email = loginForm.username.value; // Firebase يستخدم البريد الإلكتروني
    let password = loginForm.password.value;

    // تنقية المدخلات كخطوة أمان إضافية
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password); // كلمة المرور لا تحتاج تنقية بنفس الشكل ولكنها ممارسة جيدة

    errorMessage.textContent = ''; // مسح أي رسائل خطأ سابقة

    // التحقق من صحة المدخلات (Client-side validation)
    if (!sanitizedEmail || !sanitizedPassword) {
        errorMessage.textContent = 'الرجاء إدخال اسم المستخدم وكلمة المرور.';
        return;
    }

    if (sanitizedPassword.length < 6) {
        errorMessage.textContent = 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.';
        return;
    }


    // =================================================================
    // 4. تسجيل الدخول باستخدام Firebase
    // =================================================================
    auth.signInWithEmailAndPassword(sanitizedEmail, sanitizedPassword)
        .then((userCredential) => {
            // تم تسجيل الدخول بنجاح
            const user = userCredential.user;
            console.log('تم تسجيل الدخول بنجاح:', user.uid);
            // TODO: قم بتوجيه المستخدم إلى صفحته الرئيسية هنا
            // window.location.href = '/dashboard.html';
            alert('تم تسجيل الدخول بنجاح!');

        })
        .catch((error) => {
            // التعامل مع الأخطاء
            console.error('فشل تسجيل الدخول:', error.code, error.message);
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                     errorMessage.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                     break;
                case 'auth/invalid-email':
                    errorMessage.textContent = 'صيغة البريد الإلكتروني غير صحيحة.';
                    break;
                default:
                    errorMessage.textContent = 'حدث خطأ ما. الرجاء المحاولة مرة أخرى.';
            }
        });
});
