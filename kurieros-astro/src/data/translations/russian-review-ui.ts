// Russian-only review-form labels. Composed into translations.form by
// translations/index.ts (overrides the .form contribution from
// review-form-footer.ts since review modal labels stay Russian per PR #131
// policy). The .reviews property contributes the leave_review key only —
// merged with reviewFormFooterTranslations.reviews via spread.

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
