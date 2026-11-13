# Real-world test plan (Phase 5)

Automated:
- `npm test` runs backend unit/HTTP tests (no database) and the React tests.
- `TEST_MONGO_URI=mongodb://127.0.0.1:27017/apna-basket-test npm --prefix backend run test:integration` runs the database tests. The URI must contain the word `test`: it wipes that database.
- After a deploy: `BASE_URL=https://<domain> npm --prefix backend run smoke`.

Use Razorpay **test mode** keys. Test card `4111 1111 1111 1111`, any future expiry and CVV; UPI `success@razorpay` / `failure@razorpay`.
Record ✅/❌, date and device for each row.

## A. Accounts
| # | Step | Expected |
|---|---|---|
| A1 | Register with weak password `abc` | Rejected: 8+ characters with a letter and a number |
| A2 | Register correctly | OTP email arrives; network response has no `otp` |
| A3 | 6 wrong OTPs | 5 × "Invalid OTP", then "Too many incorrect attempts"; resend gives a fresh code |
| A4 | Correct OTP | Signed in; navbar shows your name |
| A5 | Phone login (new number) | Account created silently; second login reuses it |
| A6 | 11+ wrong logins quickly | 401s then 429 |
| A7 | Admin > Users | Names and "Joined" dates visible; response has no password/otp/addresses |

## B. Browsing and cart
| B1 | Home, Shop, search, category chips, product page | Loads; images show; sold-out disabled |
| B2 | Raise quantity above stock | Capped at stock |
| B3 | Reload | Cart persists |
| B4 | Admin lowers stock while item is in cart | Cart warns / reduces |

## C. Cash on Delivery
| C1 | Place COD order | Success page with order number; cart emptied; email/SMS; stock reduced |
| C2 | Totals | Checkout summary = My Orders = admin (items + delivery − discount) |
| C3 | Student discount with `x@gmail.com` | Refused; stock unchanged |
| C4 | Student discount with `x@college.ac.in` | 10% off items |
| C5 | PIN `12345` / PIN you do not serve | Refused with a clear message, stock untouched |
| C6 | Two phones buy the last unit at once | One succeeds, one told "only N left" |
| C7 | Second order | Saved address and name prefilled |

## D. Razorpay (test mode)
| D1 | Pay with test card | Order **paid**, success page, email; My Orders shows Paid |
| D2 | Close the popup | Message to retry; "Pay now" works without creating a second order |
| D3 | Wait `PAYMENT_HOLD_MINUTES` (set to 2) | Order auto-cancelled, stock returned |
| D4 | Pay, then close the tab before it redirects | Webhook marks it paid within a minute |
| D5 | Edit the amount/price in dev tools | Ignored: Razorpay amount = server total |
| D6 | Replay verify with a changed signature | 400 |
| D7 | Another account calls verify for your order | 404 |

## E. Cancellation
| E1 | Customer cancels pending COD order | Cancelled, stock restored once |
| E2 | Customer cancels a paid online order | `refund_pending` or `refunded`; refund visible in Razorpay |
| E3 | Cancel twice / two tabs | Stock restored once; second gets "already cancelled" |
| E4 | Cancel after admin marked it packed | Refused |
| E5 | Admin reopens a cancelled order | Refused |

## F. Admin
| F1 | Dashboard revenue | Equals the sum of **paid, not cancelled/refunded** orders. COD joins revenue when delivered |
| F2 | Add/edit product, upload image, change stock, hide product | Shop reflects it |
| F3 | Orders: pending → confirmed → packed → shipped → delivered | Status emails/SMS; history shown on order page; cannot go backwards; online order cannot ship before it is paid |
| F4 | Customer token on admin routes | 403 |

## G. Mobile (real phone + DevTools 360×640, 390×844, iPad)
Home, menu, Shop, Product, Cart, Checkout (numeric keypad for phone/PIN, slot picker), Razorpay popup, My Orders, Order tracking page, Admin tables scroll sideways, no horizontal page scroll, tap targets ≥ 44px, Hindi language toggle.

## H. Production only
| H1 | `/api/health` is 200 | |
| H2 | Headers: CSP, HSTS, nosniff | |
| H3 | Razorpay popup works under the CSP (no CSP errors in console) | |
| H4 | `/api/store/config`, `/api/me/addresses`, `/api/contact` respond with JSON (they were not mounted before) | |
| H5 | Restart the service | Sessions still valid, pending online orders still payable |
| H6 | Restore a backup into a scratch DB | Users, orders, products present |
