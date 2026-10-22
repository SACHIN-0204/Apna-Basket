import React from "react";
import { Link } from "react-router-dom";
import InfoPage from "../components/InfoPage";
import { STORE } from "../config/store";

const GROUPS = [
    {
        title: "Ordering",
        items: [
            {
                q: "Do I need an account to place an order?",
                a: (
                    <>
                        Yes. Please <Link to="/register">create an account</Link> and verify your email with the one-time
                        password (OTP) we send you. This lets you track orders and checkout faster next time.
                    </>
                ),
            },
            {
                q: "I didn't receive my verification OTP. What should I do?",
                a: "Check your spam or promotions folder first. If it's not there, try registering again to get a fresh OTP. The OTP expires after a short time, so use the latest one. Still stuck? Contact us and we'll help.",
            },
            {
                q: "A product I want is out of stock. Will it come back?",
                a: "Stock is updated as items sell. If a product is unavailable, check back soon or message us and we'll let you know when it's expected.",
            },
            {
                q: "Can I change my order after placing it?",
                a: (
                    <>
                        Call us as soon as possible. If your order hasn't been shipped yet, we'll do our best to update or cancel
                        it. See our <Link to="/returns">Returns & Cancellations</Link> page.
                    </>
                ),
            },
        ],
    },
    {
        title: "Payments & Offers",
        items: [
            {
                q: "What payment methods do you accept?",
                a: "You can pay by Cash on Delivery or online through Razorpay (UPI, cards, net banking and wallets, depending on what Razorpay offers for your account).",
            },
            {
                q: "Is online payment safe?",
                a: "Yes. Online payments are processed by Razorpay. We never see or store your card or bank details.",
            },
            {
                q: "Do you offer a student discount?",
                a: `Yes. Students get ${STORE.studentDiscountPercent}% off the cart value at checkout by using the student option with a valid student email. We may verify eligibility, and can cancel an order if the discount was claimed incorrectly.`,
            },
        ],
    },
    {
        title: "Delivery",
        items: [
            {
                q: "How much is delivery?",
                a: `A flat delivery fee of ₹${STORE.deliveryFee} per order is shown in your cart and at checkout before you pay.`,
            },
            {
                q: "How can I track my order?",
                a: (
                    <>
                        Open <Link to="/myorders">My Orders</Link> to see whether your order is Pending, Shipped or Delivered.
                        We also email you when the status changes.
                    </>
                ),
            },
            {
                q: "Do you deliver to my area?",
                a: (
                    <>
                        Details are on our <Link to="/shipping">Shipping Info</Link> page. If you're unsure, contact us with your
                        PIN code and we'll confirm.
                    </>
                ),
            },
        ],
    },
    {
        title: "Returns & Refunds",
        items: [
            {
                q: "What if I receive a damaged, wrong or expired item?",
                a: (
                    <>
                        Tell us within 24 hours of delivery with your order ID and a photo, and we'll replace the item or refund
                        you. Full details are on the <Link to="/returns">Returns</Link> page.
                    </>
                ),
            },
            {
                q: "How long do refunds take?",
                a: "Once a refund is approved, online payments go back to your original payment method. Timing depends on your bank or payment provider. See the Returns page for details.",
            },
        ],
    },
    {
        title: "Your Account",
        items: [
            {
                q: "How do I update my details or delete my account?",
                a: (
                    <>
                        You can view your details on your <Link to="/profile">Profile</Link> page. To correct or delete your
                        data, contact us and we'll take care of it. See our <Link to="/privacy">Privacy Policy</Link>.
                    </>
                ),
            },
        ],
    },
];

const FAQ = () => {
    return (
        <InfoPage
            title="Frequently Asked Questions"
            subtitle="Quick answers about ordering, payment, delivery and returns."
            wide
        >
            {GROUPS.map((group) => (
                <section className="faq-group" key={group.title}>
                    <h2>{group.title}</h2>
                    {group.items.map((item) => (
                        <details className="faq-item" key={item.q}>
                            <summary>{item.q}</summary>
                            <div className="faq-answer">{item.a}</div>
                        </details>
                    ))}
                </section>
            ))}

            <div className="info-body">
                <h2>Still need help?</h2>
                <p>
                    Reach us at <a href={STORE.phoneHref}>{STORE.phone}</a> or{" "}
                    <a href={`mailto:${STORE.email}`}>{STORE.email}</a>, or use our <Link to="/contact">contact form</Link>.
                </p>
            </div>
        </InfoPage>
    );
};

export default FAQ;
