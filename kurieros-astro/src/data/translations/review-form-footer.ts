// Review form + footer overrides — extends `translations.reviews`,
// sets `translations.form`, and merges into `translations.footer`.
// Applied after base + before russian-review-ui.
//
// Russian-only per PR #131 policy — shell UI does not translate.

export const reviewFormFooterTranslations: {
  reviews: Record<string, string>;
  form: Record<string, string>;
  footer: Record<string, string>;
} = {
  reviews: {
    vacancy_title: 'Отзывы о вакансии',
    count_suffix: 'отзывов',
    leave_review: 'Оставить отзыв',
    no_reviews: 'Пока нет отзывов для этой вакансии. Будьте первым!',
    new_review: 'Новый отзыв',
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
  footer: {
    cloud_courier: 'Работа курьером',
    cloud_foot: 'Пеший курьер',
    cloud_no_exp: 'Без опыта',
    cloud_students: 'Для студентов',
    telegram_jobs: 'Telegram-канал (Вакансии)',
    vk_group: 'Группа ВКонтакте',
  },
};
