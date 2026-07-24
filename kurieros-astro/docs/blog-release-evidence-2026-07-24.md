# Blog release evidence — 2026-07-24

Проверка выполнена перед включением первого production-буфера автопубликации.

## Проверенные источники

- `yandex-pro-delivery` — HTTP 200, публичная страница доставки Яндекс Про доступна.
- `fns-npd-regime` — HTTP 200, страница ФНС о НПД доступна.
- `fns-npd-faq` — HTTP 200, FAQ НПД доступен.
- `fns-npd-receipts` — HTTP 200, материал ФНС о чеках НПД доступен.
- `kuper-courier-work` — HTTP 200, публичная страница работы Купера доступна.
- `yandex-eda-legal` — HTTP 200, пользовательское соглашение Яндекс Еды доступно.

## Исключены из первого буфера

- Материалы с `ozon-courier-careers` оставлены на более поздние слоты: текущая автоматическая проверка источника из Node fetch не получила страницу.
- Материалы с `rostrud-employment-relations` оставлены на более поздние слоты: сохранённая ссылка Роструда вернула HTTP 404.
- Материалы со статусом `blocked` и `internal-dataset` не входят в первый ready buffer.

## Первый ready buffer

- `skolko-zarabatyvaet-kurer-yandex-eda-2026`
- `kurer-na-lichnom-avto-rashody-i-pribyl`
- `kak-proyti-pervuyu-nedelyu-kurerom`
- `nuzhen-li-elektrovelosiped-kureru`
- `skolko-platyat-kureram-kupera`
- `s-kem-kurer-zaklyuchaet-dogovor`
- `podrabotka-kurerom-posle-osnovnoy-raboty`
- `kak-povysit-dohod-kureru-bez-pererabotok`
- `kak-vybrat-rayon-dlya-raboty-kurerom`
- `kak-kureru-vesti-uchet-dohodov-i-rashodov`
- `chistyy-dohod-kurera-posle-rashodov`
- `dohod-kurera-za-4-6-8-12-chasov`
