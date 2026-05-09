// Russian-only fallback for the review modal labels.
//
// .reviews is merged into EVERY locale (legacy behavior preserved
// from the original translations.ts; affects only the
// 'leave_review' key which is identical to the per-locale value
// already supplied by review-form-footer for most languages, so the
// override is mostly a no-op).
//
// .form is intentionally scoped to translations.ru only — see the
// post-processing loop in ./index.ts. Earlier the loop overwrote
// .form with Russian for EVERY language, breaking i18n for
// uz/tg/ky/hy/kk/az/uk/be/hi/vi/zh; that bug was fixed by scoping.

export const russianReviewUi = {
  reviews: {
    leave_review: 'Оставить отзыв',
  },
  form: {
    name: 'Ваше имя',
    city: 'Город',
    pros: 'Достоинства',
    cons: 'Недостатки',
    comment: 'Комментарий',
    rating: 'Оценка',
    submit: 'Отправить отзыв',
    success_title: 'Спасибо за отзыв!',
    success_desc: 'Ваш отзыв успешно отправлен и будет опубликован после проверки модератором.',
    close: 'Закрыть',
  },
};
