import type { SupportedLanguage } from './types';

// Review form + footer overrides — extends translations[lang].reviews,
// sets translations[lang].form, and merges into translations[lang].footer.
// Applied after base + before russian-review-ui (which is a Russian-only
// fallback for translations.ru.form).

export const reviewFormFooterTranslations: Record<SupportedLanguage, {
  reviews: Record<string, string>;
  form: Record<string, string>;
  footer: Record<string, string>;
}> = {
  ru: {
    reviews: { vacancy_title: 'Отзывы о вакансии', count_suffix: 'отзывов', leave_review: 'Оставить отзыв', no_reviews: 'Пока нет отзывов для этой вакансии. Будьте первым!', new_review: 'Новый отзыв' },
    form: { name: 'Ваше имя', name_placeholder: 'Например, Алексей', city: 'Город', city_placeholder: 'Например, Москва', pros: 'Достоинства', pros_placeholder: 'Что вам понравилось?', cons: 'Недостатки', cons_placeholder: 'Что можно улучшить?', comment: 'Комментарий', comment_placeholder: 'Общее впечатление о работе', rating: 'Оценка', submit: 'Отправить отзыв', success_title: 'Спасибо за отзыв!', success_desc: 'Ваш отзыв успешно отправлен и будет опубликован после проверки модератором.', close: 'Закрыть' },
    footer: { cloud_courier: 'Работа курьером', cloud_foot: 'Пеший курьер', cloud_no_exp: 'Без опыта', cloud_students: 'Для студентов', telegram_jobs: 'Telegram-канал (Вакансии)', vk_group: 'Группа ВКонтакте' },
  },
  uz: {
    reviews: { vacancy_title: 'Vakansiya sharhlari', count_suffix: 'sharh', leave_review: 'Sharh qoldirish', no_reviews: 'Bu vakansiya uchun hozircha sharh yo‘q. Birinchi bo‘ling!', new_review: 'Yangi sharh' },
    form: { name: 'Ismingiz', name_placeholder: 'Masalan, Aleksey', city: 'Shahar', city_placeholder: 'Masalan, Moskva', pros: 'Afzalliklar', pros_placeholder: 'Nima yoqdi?', cons: 'Kamchiliklar', cons_placeholder: 'Nimani yaxshilash mumkin?', comment: 'Izoh', comment_placeholder: 'Ish haqidagi umumiy taassurot', rating: 'Baho', submit: 'Sharh yuborish', success_title: 'Sharh uchun rahmat!', success_desc: 'Sharhingiz yuborildi va moderator tekshiruvidan keyin chop etiladi.', close: 'Yopish' },
    footer: { cloud_courier: 'Kuryer ishi', cloud_foot: 'Piyoda kuryer', cloud_no_exp: 'Tajribasiz', cloud_students: 'Talabalar uchun', telegram_jobs: 'Telegram kanali (vakansiyalar)', vk_group: 'VKontakte guruhi' },
  },
  tg: {
    reviews: { vacancy_title: 'Шарҳҳо дар бораи вакансия', count_suffix: 'шарҳ', leave_review: 'Шарҳ гузоштан', no_reviews: 'Барои ин вакансия ҳоло шарҳ нест. Аввалин бошед!', new_review: 'Шарҳи нав' },
    form: { name: 'Номи шумо', name_placeholder: 'Масалан, Алексей', city: 'Шаҳр', city_placeholder: 'Масалан, Москва', pros: 'Бартариҳо', pros_placeholder: 'Чӣ ба шумо писанд омад?', cons: 'Камбудиҳо', cons_placeholder: 'Чиро беҳтар кардан мумкин?', comment: 'Шарҳ', comment_placeholder: 'Таассуроти умумӣ аз кор', rating: 'Баҳо', submit: 'Фиристодани шарҳ', success_title: 'Ташаккур барои шарҳ!', success_desc: 'Шарҳи шумо фиристода шуд ва пас аз санҷиши модератор нашр мешавад.', close: 'Пӯшидан' },
    footer: { cloud_courier: 'Кори курерӣ', cloud_foot: 'Курери пиёда', cloud_no_exp: 'Бе таҷриба', cloud_students: 'Барои донишҷӯён', telegram_jobs: 'Канали Telegram (вакансияҳо)', vk_group: 'Гурӯҳи ВКонтакте' },
  },
  ky: {
    reviews: { vacancy_title: 'Вакансия боюнча пикирлер', count_suffix: 'пикир', leave_review: 'Пикир калтыруу', no_reviews: 'Бул вакансия боюнча азырынча пикир жок. Биринчи болуңуз!', new_review: 'Жаңы пикир' },
    form: { name: 'Атыңыз', name_placeholder: 'Мисалы, Алексей', city: 'Шаар', city_placeholder: 'Мисалы, Москва', pros: 'Артыкчылыктар', pros_placeholder: 'Эмнеси жакты?', cons: 'Кемчиликтер', cons_placeholder: 'Эмнени жакшыртса болот?', comment: 'Комментарий', comment_placeholder: 'Иш тууралуу жалпы таасир', rating: 'Баалоо', submit: 'Пикир жөнөтүү', success_title: 'Пикириңиз үчүн рахмат!', success_desc: 'Пикириңиз жөнөтүлдү жана модератор текшергенден кийин жарыяланат.', close: 'Жабуу' },
    footer: { cloud_courier: 'Курьер жумушу', cloud_foot: 'Жөө курьер', cloud_no_exp: 'Тажрыйбасыз', cloud_students: 'Студенттер үчүн', telegram_jobs: 'Telegram каналы (вакансиялар)', vk_group: 'ВКонтакте тобу' },
  },
  hy: {
    reviews: { vacancy_title: 'Կարծիքներ թափուր աշխատանքի մասին', count_suffix: 'կարծիք', leave_review: 'Թողնել կարծիք', no_reviews: 'Այս թափուր աշխատանքի համար դեռ կարծիքներ չկան։ Եղեք առաջինը։', new_review: 'Նոր կարծիք' },
    form: { name: 'Ձեր անունը', name_placeholder: 'Օրինակ՝ Ալեքսեյ', city: 'Քաղաք', city_placeholder: 'Օրինակ՝ Մոսկվա', pros: 'Առավելություններ', pros_placeholder: 'Ի՞նչը ձեզ դուր եկավ', cons: 'Թերություններ', cons_placeholder: 'Ի՞նչը կարելի է բարելավել', comment: 'Մեկնաբանություն', comment_placeholder: 'Ընդհանուր տպավորություն աշխատանքից', rating: 'Գնահատական', submit: 'Ուղարկել կարծիքը', success_title: 'Շնորհակալություն կարծիքի համար։', success_desc: 'Ձեր կարծիքը ուղարկվել է և կհրապարակվի մոդերատորի ստուգումից հետո։', close: 'Փակել' },
    footer: { cloud_courier: 'Սուրհանդակային աշխատանք', cloud_foot: 'Հետիոտն սուրհանդակ', cloud_no_exp: 'Առանց փորձի', cloud_students: 'Ուսանողների համար', telegram_jobs: 'Telegram ալիք (թափուր աշխատանքներ)', vk_group: 'VKontakte խումբ' },
  },
  kk: {
    reviews: { vacancy_title: 'Вакансия пікірлері', count_suffix: 'пікір', leave_review: 'Пікір қалдыру', no_reviews: 'Бұл вакансия бойынша әзірге пікір жоқ. Бірінші болыңыз!', new_review: 'Жаңа пікір' },
    form: { name: 'Атыңыз', name_placeholder: 'Мысалы, Алексей', city: 'Қала', city_placeholder: 'Мысалы, Мәскеу', pros: 'Артықшылықтар', pros_placeholder: 'Не ұнады?', cons: 'Кемшіліктер', cons_placeholder: 'Нені жақсартуға болады?', comment: 'Пікір', comment_placeholder: 'Жұмыс туралы жалпы әсер', rating: 'Баға', submit: 'Пікір жіберу', success_title: 'Пікіріңізге рахмет!', success_desc: 'Пікіріңіз жіберілді және модератор тексергеннен кейін жарияланады.', close: 'Жабу' },
    footer: { cloud_courier: 'Курьер жұмысы', cloud_foot: 'Жаяу курьер', cloud_no_exp: 'Тәжірибесіз', cloud_students: 'Студенттерге', telegram_jobs: 'Telegram арнасы (вакансиялар)', vk_group: 'ВКонтакте тобы' },
  },
  az: {
    reviews: { vacancy_title: 'Vakansiya rəyləri', count_suffix: 'rəy', leave_review: 'Rəy yaz', no_reviews: 'Bu vakansiya üçün hələ rəy yoxdur. Birinci olun!', new_review: 'Yeni rəy' },
    form: { name: 'Adınız', name_placeholder: 'Məsələn, Aleksey', city: 'Şəhər', city_placeholder: 'Məsələn, Moskva', pros: 'Üstünlüklər', pros_placeholder: 'Nə xoşunuza gəldi?', cons: 'Çatışmazlıqlar', cons_placeholder: 'Nə yaxşılaşdırıla bilər?', comment: 'Şərh', comment_placeholder: 'İş haqqında ümumi təəssürat', rating: 'Qiymət', submit: 'Rəy göndər', success_title: 'Rəy üçün təşəkkürlər!', success_desc: 'Rəyiniz göndərildi və moderator yoxlamasından sonra dərc ediləcək.', close: 'Bağla' },
    footer: { cloud_courier: 'Kuryer işi', cloud_foot: 'Piyada kuryer', cloud_no_exp: 'Təcrübəsiz', cloud_students: 'Tələbələr üçün', telegram_jobs: 'Telegram kanalı (vakansiyalar)', vk_group: 'VKontakte qrupu' },
  },
  uk: {
    reviews: { vacancy_title: 'Відгуки про вакансію', count_suffix: 'відгуків', leave_review: 'Залишити відгук', no_reviews: 'Поки немає відгуків для цієї вакансії. Будьте першим!', new_review: 'Новий відгук' },
    form: { name: 'Ваше ім’я', name_placeholder: 'Наприклад, Олексій', city: 'Місто', city_placeholder: 'Наприклад, Москва', pros: 'Переваги', pros_placeholder: 'Що вам сподобалося?', cons: 'Недоліки', cons_placeholder: 'Що можна покращити?', comment: 'Коментар', comment_placeholder: 'Загальне враження від роботи', rating: 'Оцінка', submit: 'Надіслати відгук', success_title: 'Дякуємо за відгук!', success_desc: 'Ваш відгук успішно надіслано і буде опубліковано після перевірки модератором.', close: 'Закрити' },
    footer: { cloud_courier: 'Робота кур’єром', cloud_foot: 'Піший кур’єр', cloud_no_exp: 'Без досвіду', cloud_students: 'Для студентів', telegram_jobs: 'Telegram-канал (вакансії)', vk_group: 'Група ВКонтакте' },
  },
  be: {
    reviews: { vacancy_title: 'Водгукі пра вакансію', count_suffix: 'водгукаў', leave_review: 'Пакінуць водгук', no_reviews: 'Пакуль няма водгукаў для гэтай вакансіі. Будзьце першым!', new_review: 'Новы водгук' },
    form: { name: 'Ваша імя', name_placeholder: 'Напрыклад, Аляксей', city: 'Горад', city_placeholder: 'Напрыклад, Масква', pros: 'Перавагі', pros_placeholder: 'Што вам спадабалася?', cons: 'Недахопы', cons_placeholder: 'Што можна палепшыць?', comment: 'Каментар', comment_placeholder: 'Агульнае ўражанне ад працы', rating: 'Ацэнка', submit: 'Адправіць водгук', success_title: 'Дзякуй за водгук!', success_desc: 'Ваш водгук паспяхова адпраўлены і будзе апублікаваны пасля праверкі мадэратарам.', close: 'Закрыць' },
    footer: { cloud_courier: 'Праца кур’ерам', cloud_foot: 'Пешы кур’ер', cloud_no_exp: 'Без досведу', cloud_students: 'Для студэнтаў', telegram_jobs: 'Telegram-канал (вакансіі)', vk_group: 'Група ВКонтакте' },
  },
  hi: {
    reviews: { vacancy_title: 'रिक्ति समीक्षाएं', count_suffix: 'समीक्षाएं', leave_review: 'समीक्षा छोड़ें', no_reviews: 'इस रिक्ति के लिए अभी कोई समीक्षा नहीं है। पहले बनें!', new_review: 'नई समीक्षा' },
    form: { name: 'आपका नाम', name_placeholder: 'उदाहरण: Alexey', city: 'शहर', city_placeholder: 'उदाहरण: Moscow', pros: 'फायदे', pros_placeholder: 'आपको क्या पसंद आया?', cons: 'कमियां', cons_placeholder: 'क्या बेहतर हो सकता है?', comment: 'टिप्पणी', comment_placeholder: 'काम के बारे में सामान्य अनुभव', rating: 'रेटिंग', submit: 'समीक्षा भेजें', success_title: 'समीक्षा के लिए धन्यवाद!', success_desc: 'आपकी समीक्षा भेज दी गई है और मॉडरेटर जांच के बाद प्रकाशित होगी।', close: 'बंद करें' },
    footer: { cloud_courier: 'कूरियर काम', cloud_foot: 'पैदल कूरियर', cloud_no_exp: 'बिना अनुभव', cloud_students: 'छात्रों के लिए', telegram_jobs: 'Telegram चैनल (रिक्तियां)', vk_group: 'VKontakte समूह' },
  },
  vi: {
    reviews: { vacancy_title: 'Đánh giá vị trí', count_suffix: 'đánh giá', leave_review: 'Để lại đánh giá', no_reviews: 'Chưa có đánh giá cho vị trí này. Hãy là người đầu tiên!', new_review: 'Đánh giá mới' },
    form: { name: 'Tên của bạn', name_placeholder: 'Ví dụ: Alexey', city: 'Thành phố', city_placeholder: 'Ví dụ: Moscow', pros: 'Ưu điểm', pros_placeholder: 'Bạn thích điều gì?', cons: 'Nhược điểm', cons_placeholder: 'Có thể cải thiện gì?', comment: 'Bình luận', comment_placeholder: 'Ấn tượng chung về công việc', rating: 'Đánh giá', submit: 'Gửi đánh giá', success_title: 'Cảm ơn bạn đã đánh giá!', success_desc: 'Đánh giá của bạn đã được gửi và sẽ được đăng sau khi kiểm duyệt.', close: 'Đóng' },
    footer: { cloud_courier: 'Việc shipper', cloud_foot: 'Shipper đi bộ', cloud_no_exp: 'Không cần kinh nghiệm', cloud_students: 'Cho sinh viên', telegram_jobs: 'Kênh Telegram (việc làm)', vk_group: 'Nhóm VKontakte' },
  },
  zh: {
    reviews: { vacancy_title: '职位评价', count_suffix: '条评价', leave_review: '留下评价', no_reviews: '这个职位暂时没有评价。成为第一个！', new_review: '新评价' },
    form: { name: '您的姓名', name_placeholder: '例如 Alexey', city: '城市', city_placeholder: '例如 Moscow', pros: '优点', pros_placeholder: '您喜欢什么？', cons: '缺点', cons_placeholder: '可以改进什么？', comment: '评论', comment_placeholder: '对工作的整体印象', rating: '评分', submit: '提交评价', success_title: '感谢您的评价！', success_desc: '您的评价已提交，审核后将发布。', close: '关闭' },
    footer: { cloud_courier: '配送工作', cloud_foot: '步行配送员', cloud_no_exp: '无需经验', cloud_students: '适合学生', telegram_jobs: 'Telegram 频道（职位）', vk_group: 'VKontakte 群组' },
  },
};
