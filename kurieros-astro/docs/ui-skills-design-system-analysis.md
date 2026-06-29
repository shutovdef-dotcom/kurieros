# UI Skills Design System Analysis

Цель: выбрать из `ui-skills.com` не просто красивые prompt skills, а те
репозитории, которые реально дают дизайн-системную основу для пробного
редизайна страницы компании.

## Классификация

| UI Skill | Source | Оценка | Почему |
| --- | --- | --- | --- |
| `shadcn-ui/shadcn` | `https://github.com/shadcn-ui/ui` | Полноценная компонентная дизайн-система | Есть CLI, компоненты, registry, presets, semantic tokens и documented composition rules. Лучший кандидат для production-переноса, но проект Astro без React-интеграции, поэтому в эксперименте используется HTML/CSS-адаптация паттернов. |
| `zeke/swiss-design` | `https://github.com/zeke/swiss-design-skill` | Полноценная visual/spec system | Нет installable components, но есть строгая система: сетка, типографика, spacing, palette, правила responsive и component patterns. Подходит как визуальный дизайн-язык. |
| `jakubkrehel/oklch-skill` | `https://github.com/jakubkrehel/oklch-skill` | Частичная дизайн-система: color tokens | Сильная основа для палитры, контраста, light/dark и semantic color roles. Не решает layout/components сама по себе. |
| `pbakaus/impeccable` | `https://github.com/pbakaus/impeccable` | Design-language / quality system | Большой repo с правилами craft, detector/harness и командами. Это не UI kit, но полноценная система принятия дизайн-решений и анти-slop constraints. |
| `dammyjay93/interface-design` | `https://github.com/Dammyjay93/interface-design` | Product UI craft system | Сильная система для dashboards/admin/product UI. Для публичной SEO-страницы компании менее точное попадание, поэтому не вошла в первый набор. |
| `nextlevelbuilder/ui-ux-pro-max` | `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill` | Design-intelligence database | Большая база стилей/палитр/типографики, но не единая дизайн-система и не component kit. Полезно для исследования, слабее для честного A/B на одном стиле. |
| `ibelick/baseline-ui` | `https://github.com/ibelick/ui-skills` | Baseline checklist | Хороший guardrail для polish, но не самостоятельный дизайн-язык. |
| `anthropics/frontend-design`, `leonxlnx/*`, `emilkowalski/*`, `jakubkrehel/make-interfaces-feel-better` | разные skill repos | Prompt/craft skills | Полезны как вкус и процесс, но не являются полноценной дизайн-системой с reusable surface. |
| `antfu/unocss` | `https://github.com/unocss/unocss` | Tooling, not design system | Это atomic CSS engine. Можно построить дизайн-систему поверх него, но сам по себе он не задаёт визуальный язык. |

## Выбранные варианты для страницы

1. `shadcn-ui` — компонентная, production-like версия.
2. `swiss-design` — строгая editorial/grid версия.
3. `oklch-system` — версия с фокусом на цветовые токены и контраст.
4. `impeccable-system` — версия с фокусом на hierarchy/craft/signature.

Все варианты используют одну и ту же компанию: `Купер (ex. СберМаркет)`.
