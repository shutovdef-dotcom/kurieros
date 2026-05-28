// Russian-only base UI dictionary.
//
// Per PR #131 policy: shell UI renders in Russian on every language page.
// `./index.ts` distributes this single dict to every language slot (the
// language switcher still works for content translations and URL routing).
//
// Layered post-load by ./index.ts to add nav.main, the vacancy.* sub-tree,
// the review-form-footer strings, the Russian-only review form, and the
// vpn.btn_close string. See ./index.ts for the assembly order — that file
// owns the merge semantics; this one is just the seed dictionary.

export const base = {
  nav: {
    vacancies: "Вакансии",
    companies: "Компании",
    blog: "Блог",
    contacts: "Контакты",
    cities: "Города",
    compare: "Сравнение",
    calculator: "Калькулятор",
    post_job: "Разместить вакансию",
    design: "Витрина Дизайнов",
    guide: "Гид для курьера",
    about: "О проекте"
  },
  hero: {
    title: "Работа курьером рядом",
    subtitle: "Сравнивайте условия в крупных компаниях: Яндекс, Додо, СДЭК и других.",
    search_placeholder: "Ваш город, должность, компания...",
    find_btn: "Найти работу",
    cta_primary: "Подобрать вакансию",
    cta_secondary: "Калькулятор дохода"
  },
  jobgrid: {
    empty_title: "Ничего не найдено",
    empty_desc: "Попробуйте сбросить фильтры или изменить поиск.",
    reset: "Сбросить всё"
  },
  filters: {
    all: "Все вакансии",
    auto: "На авто",
    bicycle: "Велокурьер",
    walking: "Пеший",
    age16: "С 16 лет",
    flexible: "Свободно"
  },
  calculator: {
    title: "Калькулятор дохода курьера",
    subtitle: "Узнайте, сколько вы можете заработать в месяц",
    days: "Дней в месяц",
    hours: "Часов в день",
    city: "Ваш город",
    result: "Примерный заработок:",
    month: "руб / мес",
    apply: "Выбрать вакансию"
  },
  location: {
    detecting: "Определяем город...",
    your_city: "Ваш город",
    view_jobs: "Все вакансии в этом городе",
    not_defined: "Город не определен",
    manual: "Выбрать вручную",
    all_cities: "Все города",
    select_city: "Выбор города"
  },
  vpn: {
    title: "Регион не определён автоматически",
    text: "Мы не смогли уверенно определить ваш город по IP. Выберите его вручную, а если списка на странице нет, мы откроем раздел с городами.",
    btn_manual: "Выбрать город",
    btn_close: "Продолжить без выбора"
  },
  job: {
    salary: "Зарплата",
    schedule: "График",
    education: "Образование",
    experience: "Опыт",
    compare: "Сравнить",
    in_compare: "В сравнении",
    apply: "Заполнить заявку",
    no_experience: "Без опыта",
    see_vacancy: "См. вакансию"
  },
  companies: {
    title: "Компании-работодатели",
    subtitle: "Смотрите бренды, сравнивайте условия и переходите к тем вакансиям, где формат работы действительно подходит.",
    active_vacancies: "активных вакансий",
    view_jobs: "Смотреть компанию",
    partner_title: "Стать партнером",
    partner_text: "Вы представляете компанию и хотите разместить свои вакансии? Свяжитесь с нами.",
    partner_btn: "Связаться"
  },
  compare: {
    eyebrow: "Сравнение вакансий",
    title: "Сравните условия и выберите лучший вариант",
    subtitle: "Выберите до 4 вакансий для детального сравнения условий.",
    limit_reached: "Можно сравнивать не более 4 вакансий одновременно.",
    empty_title: "Список сравнения пока пуст",
    empty_text: "Добавьте несколько вакансий из общей ленты, чтобы сравнить зарплату, график, выплаты и оформление в одном месте.",
    empty_btn: "Вернуться к вакансиям"
  },
  cities: {
    title: "Работа курьером по городам России",
    subtitle: "Выберите город, посмотрите активные бренды, затем откройте локальную подборку вакансий и подходящий формат работы.",
    vacancies_1: "вакансия",
    vacancies_2: "вакансии",
    vacancies_5: "вакансий"
  },
  contacts: {
    title: "Связаться с нами",
    subtitle: "Мы открыты для предложений и всегда рады услышать ваш отзыв о сайте.",
    collab: "Сотрудничество",
    collab_text: "Для компаний и рекламных агентств",
    support: "Поддержка",
    support_text: "Для курьеров и соискателей",
    editor: "Редакция блога",
    editor_text: "Предложить статью или прислать историю",
    form_title: "Подготовить сообщение",
    form_name: "Ваше имя",
    form_contact: "Email или Telegram",
    form_msg: "Сообщение",
    form_btn: "Показать варианты связи"
  },
  blog: {
    materials: "Материалы по теме"
  },
  reviews: {
    title: "Отзывы курьеров",
    subtitle: "Коротко о том, как вакансии ощущаются в реальной работе."
  },
  faq: {
    title: "Частые вопросы",
    subtitle: "Главное перед тем, как откликаться на вакансию.",
    q1: "Со скольки лет можно работать курьером?",
    a1: "В большинстве компаний можно устроиться пешим курьером или велокурьером уже с 16 лет. Для работы на автомобиле обычно нужен возраст 18+ и права категории B.",
    q2: "Сколько реально зарабатывает курьер в 2026 году?",
    a2: "Доход зависит от города, транспорта, графика и компании. Пешие курьеры обычно зарабатывают меньше, вело и автоформаты заметно увеличивают итоговый доход.",
    q3: "Нужна ли собственная термосумка?",
    a3: "Чаще всего нет: агрегаторы и сервисы доставки выдают экипировку и термосумку после подключения или короткого обучения."
  },
  footer: {
    desc: "Ваш надежный справочник для легкого трудоустройства. Соединяем соискателей с миллионными брендами по всей России без посредников.",
    nav_title: "Навигация",
    social_title: "Мы в соцсетях",
    // Legal-block strings (added with /about/ + /privacy/ pages —
    // see PR #188). `legal_status` describes the operator's tax
    // status; `privacy_link` is the visible label in `.footer-bottom`.
    legal_status: "Плательщик НПД",
    privacy_link: "Политика конфиденциальности"
  }
};
