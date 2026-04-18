import { CITIES } from './constants';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './translations';
import { vacancySources } from './vacancies';
import type {
  EmploymentFormat,
  GeneratedJob,
  MedicalBookRequirement,
  PayModel,
  TransportMode,
  VacancyOffer,
  VacancySource,
} from './vacancyTypes';
import { slugifyCity } from '../utils/cities';

const TRANSPORT_TAGS: Record<TransportMode, string> = {
  foot: 'foot',
  auto: 'auto',
  bicycle: 'bicycle',
};

type LocalizedLabels<T extends string> = Record<SupportedLanguage, Record<T, string>>;

const TRANSPORT_LABELS: LocalizedLabels<TransportMode> = {
  ru: { foot: 'Пеший', auto: 'На авто', bicycle: 'На велосипеде' },
  uz: { foot: 'Piyoda', auto: 'Avtomobilda', bicycle: 'Velosipedda' },
  tg: { foot: 'Пиёда', auto: 'Бо мошин', bicycle: 'Бо велосипед' },
  ky: { foot: 'Жөө', auto: 'Унаа менен', bicycle: 'Велосипед менен' },
  hy: { foot: 'Հետիոտն', auto: 'Ավտոյով', bicycle: 'Հեծանիվով' },
  kk: { foot: 'Жаяу', auto: 'Көлікпен', bicycle: 'Велосипедпен' },
  az: { foot: 'Piyada', auto: 'Avtomobillə', bicycle: 'Velosipedlə' },
  uk: { foot: 'Пішки', auto: 'На авто', bicycle: 'На велосипеді' },
  be: { foot: 'Пешшу', auto: 'На аўто', bicycle: 'На ровары' },
  hi: { foot: 'पैदल', auto: 'कार से', bicycle: 'साइकिल से' },
  vi: { foot: 'Đi bộ', auto: 'Bằng ô tô', bicycle: 'Bằng xe đạp' },
  zh: { foot: '步行', auto: '开车', bicycle: '骑自行车' },
};

const TRANSPORT_TITLES: LocalizedLabels<TransportMode> = {
  ru: { foot: 'Пеший курьер', auto: 'Автокурьер', bicycle: 'Велокурьер' },
  uz: { foot: 'Piyoda kuryer', auto: 'Avtokuryer', bicycle: 'Velokuryer' },
  tg: { foot: 'Курери пиёда', auto: 'Автокурер', bicycle: 'Велокурер' },
  ky: { foot: 'Жөө курьер', auto: 'Автокурьер', bicycle: 'Велокурьер' },
  hy: { foot: 'Հետիոտն սուրհանդակ', auto: 'Ավտոսուրհանդակ', bicycle: 'Հեծանվային սուրհանդակ' },
  kk: { foot: 'Жаяу курьер', auto: 'Автокурьер', bicycle: 'Велокурьер' },
  az: { foot: 'Piyada kuryer', auto: 'Avtokuryer', bicycle: 'Velokuryer' },
  uk: { foot: "Піший кур'єр", auto: "Автокур'єр", bicycle: "Велокур'єр" },
  be: { foot: "Пешы кур'ер", auto: "Аўтакур'ер", bicycle: "Велакур'ер" },
  hi: { foot: 'पैदल कूरियर', auto: 'कार कूरियर', bicycle: 'साइकिल कूरियर' },
  vi: { foot: 'Shipper đi bộ', auto: 'Shipper ô tô', bicycle: 'Shipper xe đạp' },
  zh: { foot: '步行配送员', auto: '汽车配送员', bicycle: '自行车配送员' },
};

const TRANSPORT_ID_PARTS: Record<TransportMode, number> = {
  foot: 1,
  bicycle: 2,
  auto: 3,
};

const EMPLOYMENT_LABELS: LocalizedLabels<EmploymentFormat> = {
  ru: { gph: 'ГПХ', self_employed: 'Самозанятость', individual_entrepreneur: 'ИП', official: 'Официальное трудоустройство' },
  uz: { gph: 'Fuqarolik-huquqiy shartnoma', self_employed: "O'zini o'zi band qilish", individual_entrepreneur: 'Yakka tartibdagi tadbirkor', official: 'Rasmiy ishga joylashish' },
  tg: { gph: 'Шартномаи шаҳрвандӣ-ҳуқуқӣ', self_employed: 'Худмашғулӣ', individual_entrepreneur: 'Соҳибкори инфиродӣ', official: 'Ба кор қабулкунии расмӣ' },
  ky: { gph: 'Жарандык-укуктук келишим', self_employed: 'Өз алдынча иштөө', individual_entrepreneur: 'Жеке ишкер', official: 'Расмий жумушка орношуу' },
  hy: { gph: 'Քաղաքացիաիրավական պայմանագիր', self_employed: 'Ինքնազբաղվածություն', individual_entrepreneur: 'Անհատ ձեռնարկատեր', official: 'Պաշտոնական աշխատանք' },
  kk: { gph: 'Азаматтық-құқықтық шарт', self_employed: 'Өзін-өзі жұмыспен қамту', individual_entrepreneur: 'Жеке кәсіпкер', official: 'Ресми жұмысқа орналасу' },
  az: { gph: 'Mülki-hüquqi müqavilə', self_employed: 'Özünüməşğulluq', individual_entrepreneur: 'Fərdi sahibkar', official: 'Rəsmi işə qəbul' },
  uk: { gph: 'Цивільно-правовий договір', self_employed: 'Самозайнятість', individual_entrepreneur: 'ФОП', official: 'Офіційне працевлаштування' },
  be: { gph: 'Грамадзянска-прававая дамова', self_employed: 'Самазанятасць', individual_entrepreneur: 'ІП', official: 'Афіцыйнае працаўладкаванне' },
  hi: { gph: 'सिविल अनुबंध', self_employed: 'स्वरोजगार', individual_entrepreneur: 'व्यक्तिगत उद्यमी', official: 'आधिकारिक रोजगार' },
  vi: { gph: 'Hợp đồng dân sự', self_employed: 'Tự doanh', individual_entrepreneur: 'Hộ kinh doanh cá nhân', official: 'Việc làm chính thức' },
  zh: { gph: '民事合同', self_employed: '自雇', individual_entrepreneur: '个体经营者', official: '正式雇佣' },
};

const MEDICAL_BOOK_LABELS: LocalizedLabels<MedicalBookRequirement> = {
  ru: { required: 'Требуется', not_required: 'Не требуется', compensated: 'Требуется, возможна компенсация', unknown: 'Уточняется' },
  uz: { required: 'Talab qilinadi', not_required: 'Talab qilinmaydi', compensated: 'Talab qilinadi, kompensatsiya bo‘lishi mumkin', unknown: 'Aniqlashtiriladi' },
  tg: { required: 'Талаб мешавад', not_required: 'Талаб намешавад', compensated: 'Талаб мешавад, ҷуброн мумкин аст', unknown: 'Уточня мешавад' },
  ky: { required: 'Талап кылынат', not_required: 'Талап кылынбайт', compensated: 'Талап кылынат, компенсация болушу мүмкүн', unknown: 'Такталат' },
  hy: { required: 'Պահանջվում է', not_required: 'Չի պահանջվում', compensated: 'Պահանջվում է, հնարավոր է փոխհատուցում', unknown: 'Ճշտվում է' },
  kk: { required: 'Қажет', not_required: 'Қажет емес', compensated: 'Қажет, өтемақы болуы мүмкін', unknown: 'Нақтыланады' },
  az: { required: 'Tələb olunur', not_required: 'Tələb olunmur', compensated: 'Tələb olunur, kompensasiya mümkündür', unknown: 'Dəqiqləşdirilir' },
  uk: { required: 'Потрібна', not_required: 'Не потрібна', compensated: 'Потрібна, можлива компенсація', unknown: 'Уточнюється' },
  be: { required: 'Патрэбна', not_required: 'Не патрабуецца', compensated: 'Патрэбна, магчыма кампенсацыя', unknown: 'Удакладняецца' },
  hi: { required: 'आवश्यक', not_required: 'आवश्यक नहीं', compensated: 'आवश्यक, मुआवजा संभव', unknown: 'स्पष्ट किया जाएगा' },
  vi: { required: 'Bắt buộc', not_required: 'Không bắt buộc', compensated: 'Bắt buộc, có thể được bồi hoàn', unknown: 'Sẽ được xác nhận' },
  zh: { required: '需要', not_required: '不需要', compensated: '需要，可补偿', unknown: '待确认' },
};

const COMMON_LABELS: Record<SupportedLanguage, Record<string, string>> = {
  ru: { noExperience: 'Без опыта', flexible: 'Свободный график', medicalBook: 'Нужна медкнижка', noEducation: 'Не требуется', weekly: 'Еженедельно', yes: 'Да', notRequired: 'Не требуется' },
  uz: { noExperience: 'Tajribasiz', flexible: 'Erkin grafik', medicalBook: 'Tibbiy daftarcha kerak', noEducation: 'Talab qilinmaydi', weekly: 'Har hafta', yes: 'Ha', notRequired: 'Talab qilinmaydi' },
  tg: { noExperience: 'Бе таҷриба', flexible: 'Ҷадвали озод', medicalBook: 'Дафтарчаи тиббӣ лозим', noEducation: 'Талаб намешавад', weekly: 'Ҳар ҳафта', yes: 'Ҳа', notRequired: 'Талаб намешавад' },
  ky: { noExperience: 'Тажрыйбасыз', flexible: 'Эркин график', medicalBook: 'Медициналык китепче керек', noEducation: 'Талап кылынбайт', weekly: 'Жума сайын', yes: 'Ооба', notRequired: 'Талап кылынбайт' },
  hy: { noExperience: 'Առանց փորձի', flexible: 'Ազատ գրաֆիկ', medicalBook: 'Պետք է բժշկական գրքույկ', noEducation: 'Չի պահանջվում', weekly: 'Շաբաթական', yes: 'Այո', notRequired: 'Չի պահանջվում' },
  kk: { noExperience: 'Тәжірибесіз', flexible: 'Еркін график', medicalBook: 'Медициналық кітапша қажет', noEducation: 'Қажет емес', weekly: 'Апта сайын', yes: 'Иә', notRequired: 'Қажет емес' },
  az: { noExperience: 'Təcrübəsiz', flexible: 'Sərbəst qrafik', medicalBook: 'Tibbi kitabça lazımdır', noEducation: 'Tələb olunmur', weekly: 'Həftəlik', yes: 'Bəli', notRequired: 'Tələb olunmur' },
  uk: { noExperience: 'Без досвіду', flexible: 'Вільний графік', medicalBook: 'Потрібна медкнижка', noEducation: 'Не потрібна', weekly: 'Щотижня', yes: 'Так', notRequired: 'Не потрібно' },
  be: { noExperience: 'Без досведу', flexible: 'Вольны графік', medicalBook: 'Патрэбна медкніжка', noEducation: 'Не патрабуецца', weekly: 'Штотыдзень', yes: 'Так', notRequired: 'Не патрабуецца' },
  hi: { noExperience: 'बिना अनुभव', flexible: 'लचीला शेड्यूल', medicalBook: 'मेडिकल बुक चाहिए', noEducation: 'आवश्यक नहीं', weekly: 'हर सप्ताह', yes: 'हाँ', notRequired: 'आवश्यक नहीं' },
  vi: { noExperience: 'Không cần kinh nghiệm', flexible: 'Lịch linh hoạt', medicalBook: 'Cần sổ y tế', noEducation: 'Không bắt buộc', weekly: 'Hàng tuần', yes: 'Có', notRequired: 'Không bắt buộc' },
  zh: { noExperience: '无需经验', flexible: '弹性时间', medicalBook: '需要健康证', noEducation: '不需要', weekly: '每周', yes: '是', notRequired: '不需要' },
};

const SCHEDULE_LABELS: Record<SupportedLanguage, string> = {
  ru: 'Свободный график от 2 часов',
  uz: '2 soatdan boshlab erkin grafik',
  tg: 'Ҷадвали озод аз 2 соат',
  ky: '2 сааттан баштап эркин график',
  hy: 'Ազատ գրաֆիկ՝ 2 ժամից',
  kk: '2 сағаттан бастап еркін график',
  az: '2 saatdan başlayan sərbəst qrafik',
  uk: 'Вільний графік від 2 годин',
  be: 'Вольны графік ад 2 гадзін',
  hi: '2 घंटे से लचीला शेड्यूल',
  vi: 'Lịch linh hoạt từ 2 giờ',
  zh: '2小时起的弹性时间',
};

const CITIZENSHIP_LABELS: Record<SupportedLanguage, Record<'all' | 'rfEaes' | 'rf' | 'default', string>> = {
  ru: { all: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии ВНЖ и патента', rfEaes: 'РФ / ЕАЭС', rf: 'РФ', default: 'РФ / ЕАЭС / страны вне ЕАЭС при наличии документов' },
  uz: { all: 'RF / Yevroosiyo iqtisodiy ittifoqi / EAEUga kirmaydigan davlatlar VNZh va patent bilan', rfEaes: 'RF / EAEU', rf: 'RF', default: 'RF / EAEU / hujjatlar bilan boshqa davlatlar' },
  tg: { all: 'РФ / ЕАЭС / кишварҳои берун аз ЕАЭС бо ВНЖ ва патент', rfEaes: 'РФ / ЕАЭС', rf: 'РФ', default: 'РФ / ЕАЭС / кишварҳои дигар бо ҳуҷҷатҳо' },
  ky: { all: 'РФ / ЕАЭС / ЕАЭСтен тышкаркы өлкөлөр ВНЖ жана патент менен', rfEaes: 'РФ / ЕАЭС', rf: 'РФ', default: 'РФ / ЕАЭС / документтери бар башка өлкөлөр' },
  hy: { all: 'ՌԴ / ԵԱՏՄ / ԵԱՏՄ-ից դուրս երկրներ՝ կացության թույլտվությամբ և պատենտով', rfEaes: 'ՌԴ / ԵԱՏՄ', rf: 'ՌԴ', default: 'ՌԴ / ԵԱՏՄ / այլ երկրներ՝ փաստաթղթերով' },
  kk: { all: 'РФ / ЕАЭО / ЕАЭО-дан тыс елдер ВНЖ және патентпен', rfEaes: 'РФ / ЕАЭО', rf: 'РФ', default: 'РФ / ЕАЭО / құжаттары бар басқа елдер' },
  az: { all: 'RF / Aİİ / Aİİ-yə daxil olmayan ölkələr VNZH və patentlə', rfEaes: 'RF / Aİİ', rf: 'RF', default: 'RF / Aİİ / sənədlərlə digər ölkələr' },
  uk: { all: 'РФ / ЄАЕС / країни поза ЄАЕС за наявності ВНЖ і патенту', rfEaes: 'РФ / ЄАЕС', rf: 'РФ', default: 'РФ / ЄАЕС / інші країни за наявності документів' },
  be: { all: 'РФ / ЕАЭС / краіны па-за ЕАЭС пры наяўнасці ВНЖ і патэнта', rfEaes: 'РФ / ЕАЭС', rf: 'РФ', default: 'РФ / ЕАЭС / іншыя краіны пры наяўнасці дакументаў' },
  hi: { all: 'रूस / EAEU / EAEU से बाहर के देश, निवास अनुमति और पेटेंट के साथ', rfEaes: 'रूस / EAEU', rf: 'रूस', default: 'रूस / EAEU / दस्तावेजों के साथ अन्य देश' },
  vi: { all: 'Nga / EAEU / quốc gia ngoài EAEU nếu có giấy cư trú và patent', rfEaes: 'Nga / EAEU', rf: 'Nga', default: 'Nga / EAEU / quốc gia khác nếu có giấy tờ' },
  zh: { all: '俄罗斯 / 欧亚经济联盟 / 非欧亚经济联盟国家，需有居留许可和工作专利', rfEaes: '俄罗斯 / 欧亚经济联盟', rf: '俄罗斯', default: '俄罗斯 / 欧亚经济联盟 / 其他国家，需有文件' },
};

const MONTHLY_SALARY_TEXT: Record<SupportedLanguage, (amount: string) => string> = {
  ru: (amount) => `до ${amount} ₽/мес`,
  uz: (amount) => `oyiga ${amount} ₽ gacha`,
  tg: (amount) => `то ${amount} ₽ дар як моҳ`,
  ky: (amount) => `айына ${amount} ₽ чейин`,
  hy: (amount) => `մինչև ${amount} ₽ ամսական`,
  kk: (amount) => `айына ${amount} ₽ дейін`,
  az: (amount) => `ayda ${amount} ₽-dək`,
  uk: (amount) => `до ${amount} ₽/міс`,
  be: (amount) => `да ${amount} ₽/мес`,
  hi: (amount) => `महीने में ${amount} ₽ तक`,
  vi: (amount) => `tối đa ${amount} ₽/tháng`,
  zh: (amount) => `每月最高 ${amount} ₽`,
};

const RATE_TEXT: Record<SupportedLanguage, (hourly: string, daily: string, monthly: string) => string> = {
  ru: (hourly, daily, monthly) => `${hourly} ₽/час, ${daily} ₽ за 12 часов, до ${monthly} ₽ за 30 смен`,
  uz: (hourly, daily, monthly) => `soatiga ${hourly} ₽, 12 soat uchun ${daily} ₽, 30 smena uchun ${monthly} ₽ gacha`,
  tg: (hourly, daily, monthly) => `${hourly} ₽/соат, ${daily} ₽ барои 12 соат, то ${monthly} ₽ барои 30 баст`,
  ky: (hourly, daily, monthly) => `саатына ${hourly} ₽, 12 саат үчүн ${daily} ₽, 30 смена үчүн ${monthly} ₽ чейин`,
  hy: (hourly, daily, monthly) => `${hourly} ₽/ժամ, ${daily} ₽ 12 ժամի համար, մինչև ${monthly} ₽ 30 հերթափոխի համար`,
  kk: (hourly, daily, monthly) => `сағатына ${hourly} ₽, 12 сағатқа ${daily} ₽, 30 ауысымға ${monthly} ₽ дейін`,
  az: (hourly, daily, monthly) => `saatda ${hourly} ₽, 12 saat üçün ${daily} ₽, 30 növbə üçün ${monthly} ₽-dək`,
  uk: (hourly, daily, monthly) => `${hourly} ₽/год, ${daily} ₽ за 12 годин, до ${monthly} ₽ за 30 змін`,
  be: (hourly, daily, monthly) => `${hourly} ₽/гадз, ${daily} ₽ за 12 гадзін, да ${monthly} ₽ за 30 змен`,
  hi: (hourly, daily, monthly) => `${hourly} ₽/घंटा, 12 घंटे के लिए ${daily} ₽, 30 शिफ्ट के लिए ${monthly} ₽ तक`,
  vi: (hourly, daily, monthly) => `${hourly} ₽/giờ, ${daily} ₽ cho 12 giờ, tối đa ${monthly} ₽ cho 30 ca`,
  zh: (hourly, daily, monthly) => `${hourly} ₽/小时，12小时 ${daily} ₽，30个班次最高 ${monthly} ₽`,
};

const PAGE_TITLE_TEXT: Record<SupportedLanguage, (title: string) => string> = {
  ru: (title) => `${title} — зарплата, условия и отклик | Курьерок`,
  uz: (title) => `${title} — daromad, shartlar va ariza | Курьерок`,
  tg: (title) => `${title} — даромад, шартҳо ва отклик | Курьерок`,
  ky: (title) => `${title} — киреше, шарттар жана отклик | Курьерок`,
  hy: (title) => `${title} — եկամուտ, պայմաններ և դիմում | Курьерок`,
  kk: (title) => `${title} — табыс, шарттар және өтінім | Курьерок`,
  az: (title) => `${title} — gəlir, şərtlər və müraciət | Курьерок`,
  uk: (title) => `${title} — зарплата, умови та відгук | Курьерок`,
  be: (title) => `${title} — заробак, умовы і водгук | Курьерок`,
  hi: (title) => `${title} — आय, शर्तें और आवेदन | Курьерок`,
  vi: (title) => `${title} — thu nhập, điều kiện và ứng tuyển | Курьерок`,
  zh: (title) => `${title} — 收入、条件和申请 | Курьерок`,
};

const PAGE_DESCRIPTION_TEXT: Record<SupportedLanguage, (job: GeneratedJob) => string> = {
  ru: (job) => `Вакансия "${job.title}" в ${job.company}: ${job.salary}, ${job.details.schedule.toLowerCase()}, ${job.details.payment_freq.toLowerCase()}. Сравните условия и переходите к отклику.`,
  uz: (job) => `"${job.title}" vakansiyasi: ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}. Shartlarni solishtiring va ariza berishga o‘ting.`,
  tg: (job) => `Вакансияи "${job.title}": ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}. Шартҳоро муқоиса кунед ва ба отклик гузаред.`,
  ky: (job) => `"${job.title}" вакансиясы: ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}. Шарттарды салыштырып, откликке өтүңүз.`,
  hy: (job) => `"${job.title}" թափուր աշխատանքը՝ ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}։ Համեմատեք պայմաններն ու դիմեք։`,
  kk: (job) => `"${job.title}" вакансиясы: ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}. Шарттарды салыстырып, өтінімге өтіңіз.`,
  az: (job) => `"${job.title}" vakansiyası: ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}. Şərtləri müqayisə edin və müraciətə keçin.`,
  uk: (job) => `Вакансія "${job.title}": ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}. Порівняйте умови та переходьте до відгуку.`,
  be: (job) => `Вакансія "${job.title}": ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}. Параўнайце ўмовы і пераходзьце да водгуку.`,
  hi: (job) => `"${job.title}" रिक्ति: ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}. शर्तों की तुलना करें और आवेदन करें।`,
  vi: (job) => `Vị trí "${job.title}": ${job.salary}, ${job.details.schedule}, ${job.details.payment_freq}. So sánh điều kiện và ứng tuyển.`,
  zh: (job) => `"${job.title}" 职位：${job.salary}，${job.details.schedule}，${job.details.payment_freq}。比较条件并申请。`,
};

const DATE_LOCALES: Record<SupportedLanguage, string> = {
  ru: 'ru-RU',
  uz: 'uz-Latn-UZ',
  tg: 'tg-TJ',
  ky: 'ky-KG',
  hy: 'hy-AM',
  kk: 'kk-KZ',
  az: 'az-AZ',
  uk: 'uk-UA',
  be: 'be-BY',
  hi: 'hi-IN',
  vi: 'vi-VN',
  zh: 'zh-CN',
};

const formatUpdatedDate = (date: string, language: SupportedLanguage) =>
  new Intl.DateTimeFormat(DATE_LOCALES[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));

const cityCodes = new Map(CITIES.map((city, index) => [city.name, index + 1]));
const cityPrepositions = new Map(CITIES.map((city) => [city.name, city.prep]));

const unique = <T>(items: T[]) => Array.from(new Set(items.filter(Boolean)));

const getLocalizedLabel = <T extends string>(
  labels: LocalizedLabels<T>,
  language: SupportedLanguage,
  key: T,
) => labels[language]?.[key] ?? labels.ru[key];

const formatAmount = (value: number) => new Intl.NumberFormat('ru-RU').format(value);

const getCompanyName = (name: string, _language: SupportedLanguage) => name;

const getCityPrep = (city: string, language: SupportedLanguage) => {
  if (language === 'ru') {
    return cityPrepositions.get(city) ?? `в ${city}`;
  }

  return city;
};

const interpolate = (value: string, offer: VacancyOffer, language: SupportedLanguage) =>
  value
    .replaceAll('{city}', offer.city)
    .replaceAll('{cityPrep}', getCityPrep(offer.city, language))
    .replaceAll('{transportTitle}', getLocalizedLabel(TRANSPORT_TITLES, language, offer.transport));

const resolveList = (
  value: VacancyOffer['requirementsOverride'],
  language: SupportedLanguage,
) => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : value[language] ?? value.ru ?? [];
};

const getContent = (source: VacancySource, language: SupportedLanguage) =>
  source.content[language] ?? source.content.ru;

const getAgeFrom = (source: VacancySource, offer: VacancyOffer) =>
  offer.ageFrom ?? source.defaults.ageFrom;

const getMedicalBook = (source: VacancySource, offer: VacancyOffer) =>
  offer.medicalBook ?? source.defaults.medicalBook ?? 'unknown';

const getCitizenship = (source: VacancySource, offer: VacancyOffer) =>
  offer.citizenship ?? source.defaults.citizenship ?? 'Уточняется';

const getEmploymentFormats = (source: VacancySource, offer: VacancyOffer) =>
  offer.employmentFormats?.length ? offer.employmentFormats : source.defaults.employmentFormats;

const getSchedule = (source: VacancySource, offer: VacancyOffer, language: SupportedLanguage) => {
  const schedule = offer.schedule ?? source.defaults.schedule;

  return schedule === SCHEDULE_LABELS.ru ? SCHEDULE_LABELS[language] : schedule;
};

const getEducation = (source: VacancySource, language: SupportedLanguage) =>
  source.defaults.education === COMMON_LABELS.ru.noEducation || !source.defaults.education
    ? COMMON_LABELS[language].noEducation
    : source.defaults.education;

const getPaymentFrequency = (value: string, language: SupportedLanguage) =>
  value === COMMON_LABELS.ru.weekly ? COMMON_LABELS[language].weekly : value;

const getCitizenshipLabel = (value: string, language: SupportedLanguage) => {
  if (value.includes('вне ЕАЭС')) return CITIZENSHIP_LABELS[language].all;
  if (value.includes('ЕАЭС')) return CITIZENSHIP_LABELS[language].rfEaes;
  if (value === 'РФ') return CITIZENSHIP_LABELS[language].rf;
  if (value.includes('при наличии документов')) return CITIZENSHIP_LABELS[language].default;

  return value;
};

const getGeneratedId = (source: VacancySource, offer: VacancyOffer, index: number) =>
  source.id * 100000 +
  ((cityCodes.get(offer.city) ?? 900 + index + 1) * 10) +
  TRANSPORT_ID_PARTS[offer.transport];

const getSalaryText = (pay: PayModel, language: SupportedLanguage) =>
  pay.monthly?.max
    ? MONTHLY_SALARY_TEXT[language](formatAmount(pay.monthly.max))
    : pay.monthly?.text ??
      pay.guaranteed?.text ??
      pay.perShift?.text ??
      pay.hourly?.text ??
      pay.perOrder?.text ??
      'Доход уточняется';

const getRateText = (pay: PayModel, language: SupportedLanguage) => {
  if (pay.hourly?.max && pay.perShift?.max && pay.monthly?.max) {
    return RATE_TEXT[language](
      formatAmount(pay.hourly.max),
      formatAmount(pay.perShift.max),
      formatAmount(pay.monthly.max),
    );
  }

  const rateFallback = [
    pay.hourly?.text,
    pay.perOrder?.text,
    pay.perShift?.text,
    pay.guaranteed?.text,
  ].filter(Boolean).join(' + ');

  return pay.rate ?? (rateFallback || getSalaryText(pay, language));
};

const getOfferRequirements = (
  contentRequirements: string[],
  offer: VacancyOffer,
  language: SupportedLanguage,
) => [...contentRequirements, ...resolveList(offer.requirementsOverride, language)];

const getOfferBenefits = (
  contentBenefits: string[],
  offer: VacancyOffer,
  language: SupportedLanguage,
) => [...contentBenefits, ...resolveList(offer.benefitsOverride, language)];

const getOfferRequiredDocuments = (
  contentRequiredDocuments: string[],
  offer: VacancyOffer,
  language: SupportedLanguage,
) => [...contentRequiredDocuments, ...resolveList(offer.requiredDocumentsOverride, language)];

const getAgeTag = (ageFrom: number) => (ageFrom <= 16 ? '16plus' : '18+');

const getSelfEmployedLabel = (formats: EmploymentFormat[]) =>
  formats.includes('self_employed') ? 'Да' : 'Не требуется';

const buildLabels = (
  labels: string[] | undefined,
  transport: TransportMode[],
  ageFrom: number,
  formats: EmploymentFormat[],
  medicalBook: MedicalBookRequirement,
  language: SupportedLanguage,
) =>
  labels?.length
    ? labels
    : unique([
      ...transport.map((mode) => getLocalizedLabel(TRANSPORT_LABELS, language, mode)),
      ageFrom <= 16 ? 'С 16 лет' : '18+',
      formats[0] ? getLocalizedLabel(EMPLOYMENT_LABELS, language, formats[0]) : '',
      medicalBook === 'required' ? COMMON_LABELS[language].medicalBook : '',
    ]);

export const buildJobsFromVacancies = (
  sources: VacancySource[],
  language: SupportedLanguage = 'ru',
): GeneratedJob[] =>
  sources.flatMap((source) =>
    source.offers
      .filter((offer) => offer.isActive)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((offer, index) => {
      const content = getContent(source, language);
      const ageFrom = getAgeFrom(source, offer);
      const transport = offer.transport;
      const formats = getEmploymentFormats(source, offer);
      const medicalBook = getMedicalBook(source, offer);
      const salary = getSalaryText(offer.pay, language);
      const applyLink = offer.applyLink ?? '#';
      const citySlug = slugifyCity(offer.city);
      const requirements = getOfferRequirements(content.requirements, offer, language);
      const benefits = getOfferBenefits(content.benefits, offer, language);
      const requiredDocuments = getOfferRequiredDocuments(content.requiredDocuments ?? [], offer, language);

      return {
        id: getGeneratedId(source, offer, index),
        sourceId: source.id,
        slug: `${source.slug}-${citySlug}-${transport}`,
        title: interpolate(content.title, offer, language),
        company: getCompanyName(source.company.name, language),
        companyLogo: source.company.logo,
        salary,
        location: offer.city,
        tags: unique([
          TRANSPORT_TAGS[transport],
          getAgeTag(ageFrom),
          ...(source.extraTags ?? []),
        ]),
        labels: buildLabels(content.labels, [transport], ageFrom, formats, medicalBook, language),
        applyLink,
        description: interpolate(content.description, offer, language),
        requirements: requirements.map((item) => interpolate(item, offer, language)),
        benefits: benefits.map((item) => interpolate(item, offer, language)),
        requiredDocuments: requiredDocuments.map((item) => interpolate(item, offer, language)),
        details: {
          rate: getRateText(offer.pay, language),
          schedule: getSchedule(source, offer, language),
          education: getEducation(source, language),
          age: language === 'ru' ? `от ${ageFrom} лет` : `18+`,
          payment_freq: getPaymentFrequency(offer.pay.paymentFrequency, language),
          citizenship: getCitizenshipLabel(getCitizenship(source, offer), language),
          medical_book: getLocalizedLabel(MEDICAL_BOOK_LABELS, language, medicalBook),
          self_employed: formats.includes('self_employed') ? COMMON_LABELS[language].yes : COMMON_LABELS[language].notRequired,
          employment_type: formats.map((format) => getLocalizedLabel(EMPLOYMENT_LABELS, language, format)).join(' / '),
          uniform: source.defaults.uniform ?? 'Уточняется',
          os: source.defaults.os ?? 'Android / iOS',
        },
        search_tags: content.searchTags ?? [],
        shortDescription: interpolate(content.shortDescription, offer, language),
        transport,
        salaryConfidence: offer.salaryConfidence,
        currency: offer.pay.currency,
        ...(offer.sourceUrl ? { sourceUrl: offer.sourceUrl } : {}),
        updatedAt: offer.updatedAt,
        ...(offer.cityDistricts?.length ? { cityDistricts: offer.cityDistricts } : {}),
        ...(typeof offer.priority === 'number' ? { priority: offer.priority } : {}),
        ...(source.isHot ? { isHot: true } : {}),
      };
    }),
  );

export const buildJobTranslations = (sources: VacancySource[]) =>
  Object.fromEntries(
    SUPPORTED_LANGUAGES.map((language) => [
      language,
      Object.fromEntries(
        buildJobsFromVacancies(sources, language).map((job) => [
          String(job.id),
          {
            page_title: PAGE_TITLE_TEXT[language](job.title),
            page_description: PAGE_DESCRIPTION_TEXT[language](job).slice(0, 170),
            updated_date: formatUpdatedDate(job.updatedAt, language),
            title: job.title,
            company: job.company,
            salary: job.salary,
            location: job.location,
            shortDescription: job.shortDescription,
            description: job.description,
            ...Object.fromEntries(job.labels.map((label, index) => [`label_${index}`, label])),
            ...Object.fromEntries(job.requirements.map((requirement, index) => [`req_${index}`, requirement])),
            ...Object.fromEntries(job.benefits.map((benefit, index) => [`ben_${index}`, benefit])),
            ...Object.fromEntries(job.requiredDocuments.map((document, index) => [`doc_${index}`, document])),
            details_schedule: job.details.schedule,
            details_education: job.details.education,
            details_payment_freq: job.details.payment_freq,
            details_age: job.details.age,
            details_citizenship: job.details.citizenship,
            details_rate: job.details.rate,
            details_employment_type: job.details.employment_type,
          },
        ]),
      ),
    ]),
  ) as Record<SupportedLanguage, Record<string, Record<string, string>>>;

const jobsData = buildJobsFromVacancies(vacancySources);
const jobTranslations = buildJobTranslations(vacancySources);

export { vacancySources };
export { jobTranslations };
export default jobsData;
