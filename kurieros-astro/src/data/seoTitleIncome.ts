import type { GeneratedJob } from './vacancyTypes';
import type { SupportedLanguage } from './translations';

// Owner-supplied ceiling, 2026-10-13. Not an employer-verified tariff:
// never convert it to monthly pay or schema baseSalary.
export const FRESH_TITLE_TEST_INCOME = 'до 8 000 ₽/день';
export const FRESH_TITLE_TEST_INCOME_NOTE =
  'Возможный доход — до 8 000 ₽/день. Это ориентир, а не гарантированная выплата: сумма зависит от города, длительности смены и заказов. Тариф и условия уточняйте при оформлении.';
export const FRESH_TITLE_TEST_INCOME_NOTES: Record<SupportedLanguage, string> = {
  ru: FRESH_TITLE_TEST_INCOME_NOTE,
  uz: 'Mumkin bo‘lgan daromad — kuniga 8 000 ₽ gacha. Bu taxminiy ko‘rsatkich, kafolatlangan to‘lov emas: summa shahar, smena davomiyligi va buyurtmalar soniga bog‘liq. Tarif va shartlarni rasmiylashtirish vaqtida aniqlashtiring.',
  tg: 'Даромади эҳтимолӣ — то 8 000 ₽ дар як рӯз. Ин танҳо нишондиҳанда аст, на пардохти кафолатнок: маблағ аз шаҳр, давомнокии смена ва шумораи фармоишҳо вобаста аст. Тариф ва шартҳоро ҳангоми бақайдгирӣ аниқ кунед.',
  ky: 'Болжолдуу киреше — күнүнө 8 000 ₽ чейин. Бул кепилденген төлөм эмес, багыт берүүчү көрсөткүч: сумма шаарга, сменанын узактыгына жана заказдарга жараша болот. Тарифти жана шарттарды каттоодо тактаңыз.',
  hy: 'Հնարավոր եկամուտը՝ մինչև 8 000 ₽ օրական։ Սա կողմնորոշիչ գումար է, ոչ թե երաշխավորված վճարում. այն կախված է քաղաքից, հերթափոխի տևողությունից և պատվերների քանակից։ Սակագինն ու պայմանները ճշտեք գրանցվելիս։',
  kk: 'Ықтимал табыс — күніне 8 000 ₽-ге дейін. Бұл кепілдендірілген төлем емес, бағдарлық сома: ол қалаға, ауысым ұзақтығына және тапсырыстарға байланысты. Тариф пен шарттарды рәсімдеу кезінде нақтылаңыз.',
  az: 'Mümkün gəlir — gündə 8 000 ₽-dək. Bu, zəmanətli ödəniş deyil, təxmini göstəricidir: məbləğ şəhərdən, növbənin müddətindən və sifarişlərin sayından asılıdır. Tarif və şərtləri rəsmiləşmə zamanı dəqiqləşdirin.',
  uk: 'Можливий дохід — до 8 000 ₽ на день. Це орієнтир, а не гарантована виплата: сума залежить від міста, тривалості зміни та кількості замовлень. Тариф і умови уточнюйте під час оформлення.',
  be: 'Магчымы даход — да 8 000 ₽ у дзень. Гэта арыенцір, а не гарантаваная выплата: сума залежыць ад горада, працягласці змены і колькасці заказаў. Тарыф і ўмовы ўдакладняйце пры афармленні.',
  hi: 'संभावित आय — प्रतिदिन 8,000 ₽ तक। यह केवल एक अनुमान है, गारंटीकृत भुगतान नहीं: राशि शहर, शिफ्ट की अवधि और ऑर्डरों की संख्या पर निर्भर करती है। आवेदन करते समय दर और शर्तों की पुष्टि करें।',
  vi: 'Thu nhập có thể đạt đến 8.000 ₽ mỗi ngày. Đây là mức tham khảo, không phải khoản thanh toán được đảm bảo: số tiền phụ thuộc vào thành phố, thời lượng ca làm và số lượng đơn hàng. Hãy xác nhận mức giá và điều kiện khi đăng ký.',
  zh: '预计收入最高为每天 8,000 ₽。这只是参考值，并非保证收入；实际金额取决于城市、班次时长和订单数量。请在办理时确认费率和条件。',
};

export const usesOwnerSuppliedOzonCourierIncome = (sourceSlug: string): boolean =>
  sourceSlug === 'ozon-fresh-courier' || sourceSlug === 'ozon-courier';

/** Keep the landing-page income identical in every courier title-test arm. */
export const applyTitleTestIncome = (
  job: GeneratedJob,
  language: SupportedLanguage = 'ru',
): GeneratedJob => {
  if (!usesOwnerSuppliedOzonCourierIncome(job.sourceSlug)) return job;
  const incomeNote = FRESH_TITLE_TEST_INCOME_NOTES[language];
  return {
    ...job,
    salary: FRESH_TITLE_TEST_INCOME,
    salaryConfidence: 'estimated',
    contentUpdatedAt: '2026-10-13',
    description: `${job.description} ${incomeNote}`,
    benefits: [
      incomeNote,
      // The first courier benefit is the old monthly-income template in
      // every translation. Remove it by its source position, not by
      // Russian words that would miss translated salary promises.
      ...job.benefits.slice(1),
    ],
    details: {
      ...job.details,
      // Rate is an intentionally RU-only field in the source model. Localize
      // the explanatory copy in description/benefits, not this field.
      rate: FRESH_TITLE_TEST_INCOME_NOTE,
      // The Fresh source says weekly. Generic hourly fallback had
      // replaced this with another provider's daily payment cadence.
      payment_freq: 'Еженедельно',
    },
  };
};
