// Russian-only fallback for the review modal labels.
//
// .reviews is merged into translations.reviews — only adds the leave_review
// key (already same value as in review-form-footer.ts).
//
// .form REPLACES translations.form (set earlier by review-form-footer.ts).
// This drops the 5 *_placeholder keys from review-form-footer; ReviewModal
// uses inline `placeholder=` HTML attributes for those fields, so the keys
// are unused dead data anyway. TODO: remove the duplication entirely
// (track via audit finding M7 — immutable shell-dict assembly).

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
