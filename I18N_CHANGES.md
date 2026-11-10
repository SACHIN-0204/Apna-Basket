# Hindi / English toggle

## What customers see

- A **हिंदी / English** button in the top menu (also in the phone's menu). One tap switches the whole
  shopping journey and the choice is remembered on that phone.
- First visit: a phone set to Hindi opens in Hindi, everything else in English.
- The page language (`<html lang>`) switches too, so screen readers and browsers pick the right voice and font.

## Translated (337 phrases)

Navigation and search, home page and banners, shop (search, sort, categories, "show more"), product cards
and product page, sticky cart bar, cart, checkout (address, PIN check, delivery time, payment, student
discount, totals), mobile sign-in and email login, order confirmation, My Orders, order tracking, profile and
saved addresses, install banner, "page not found", order and payment status names.

Also translated on screen: the common error messages the server sends (wrong code, code expired, PIN code not
served, delivery time closed, order cancel messages, stock messages with product names and numbers), the
"Today / Tomorrow" in delivery times, and Hindi names for the usual product categories.
An error the dictionary does not know is shown in English rather than hidden.

## Not translated (on purpose)

| Left in English | Why |
|-----------------|-----|
| Terms, Privacy, Returns, Shipping, FAQ, About, Contact pages | Legal and policy wording should be translated by a professional |
| Email sign-up page (`Register`) | The secondary path now that mobile sign-in is the default |
| Admin pages | Used by the store team |
| Product names and descriptions | You type these. The product form has one name field, so they show as entered |
| SMS and email messages | They are sent by the server in English. SMS templates also need DLT approval in India, per language |
| Razorpay payment window | Controlled by Razorpay |

## Please have a Hindi speaker read `frontend/src/i18n/hi.js`

I wrote natural spoken Hindi using the English words customers already use (cart, order, delivery, OTP style
words), but wording is a matter of taste and local usage. It is one plain file: change any line and save.
Keep the `{words in braces}` exactly as they are: the app fills them in (names, numbers, amounts).

## How to add or change text later

1. Add the key to `frontend/src/i18n/en.js` and `hi.js` (same key in both).
2. Use it in a component: `const { t } = useT();` then `{t('your.key', { name })}`.
3. `npm test` in `frontend/` fails if a key is missing in either language, has a missing `{placeholder}`,
   or is used in code but not defined. So a typo can never reach customers as raw text.

To translate the store's own product names, add Hindi fields (for example `nameHi`) to the product model and
the admin form. Say so if you want that next.

## Tests

`npm test` in `frontend/`: 57 tests, 18 of them new: dictionary parity and placeholders, a scan of every source
file for keys that do not exist, translation helpers (plurals, server messages, delivery labels, categories),
language detection and remembering, and the toggle in the real navbar, product card and sign-in form.
Lint is clean and the production build compiles.

## Please check on a real phone

I could not look at the pages in a browser. Hindi sentences are often longer than English ones, so please
look at: the top menu on a narrow phone, the sticky cart bar, the checkout time buttons and the order timeline.
If anything overflows, tell me which screen and I will adjust the layout.
