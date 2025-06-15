document.addEventListener('DOMContentLoaded', function() {
    // الحصول على عناصر الصفحة
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    // بيانات الدخول الصحيحة (للمحاكاة فقط)
    // في تطبيق حقيقي، يجب أن يتم التحقق من هذه البيانات من خلال السيرفر
    const CORRECT_USERNAME = 'admin';
    const CORRECT_PASSWORD = 'YALG_2025!';

    // متغير لتتبع مؤقت إخفاء الرسالة
    let errorTimeout;

    // وظيفة لإظهار رسالة الخطأ
    function showError(message) {
        // مسح أي مؤقت سابق لضمان عدم اختفاء الرسالة الجديدة بسرعة
        clearTimeout(errorTimeout);

        errorMessage.textContent = message;
        errorMessage.classList.add('show');

        // إخفاء الرسالة بعد 4 ثوانٍ
        errorTimeout = setTimeout(() => {
            hideError();
        }, 4000);
    }

    // وظيفة لإخفاء رسالة الخطأ
    function hideError() {
        errorMessage.classList.remove('show');
    }

    // التعامل مع حدث إرسال النموذج
    loginForm.addEventListener('submit', function(event) {
        // منع السلوك الافتراضي للنموذج (إعادة تحميل الصفحة)
        event.preventDefault();

        // الحصول على القيم المدخلة من المستخدم وإزالة أي مسافات بيضاء
        const enteredUsername = usernameInput.value.trim();
        const enteredPassword = passwordInput.value.trim();

        // التحقق مما إذا كانت البيانات صحيحة
        if (enteredUsername === CORRECT_USERNAME && enteredPassword === CORRECT_PASSWORD) {
            // تسجيل دخول ناجح
            console.log('Login Successful! Redirecting...');
            // توجيه المستخدم إلى لوحة التحكم
            window.location.href = 'bord/bord.html';
        } else {
            // تسجيل دخول فاشل
            console.error('Login Failed!');
            showError('غير مصرح لك بالدخول لهذا القسم.');
        }
    });

    // تحسين تجربة المستخدم: إخفاء رسالة الخطأ عند البدء في الكتابة مجددًا
    usernameInput.addEventListener('input', hideError);
    passwordInput.addEventListener('input', hideError);
});
