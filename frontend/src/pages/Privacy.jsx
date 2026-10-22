import React from "react";
import { Link } from "react-router-dom";
import InfoPage from "../components/InfoPage";
import { STORE } from "../config/store";

const Privacy = () => {
    return (
        <InfoPage
            title="Privacy Policy"
            subtitle="What we collect, why we collect it, and how we look after it."
            updated={STORE.lastUpdated}
        >
            <p>
                {STORE.name} ("we", "us") respects your privacy. This policy explains how we handle your information when you
                use our website to shop for groceries and household items.
            </p>

            <h2>Information we collect</h2>
            <ul>
                <li><strong>Account details:</strong> your name, email address and password. Your password is stored in hashed (scrambled) form, never as plain text.</li>
                <li><strong>Verification data:</strong> a one-time password (OTP) sent to your email to confirm it's yours, which expires after a short time.</li>
                <li><strong>Order details:</strong> items ordered, order total, payment method chosen and order status.</li>
                <li><strong>Delivery address:</strong> your name, street, city, state and PIN code for each order.</li>
                <li><strong>Messages you send us:</strong> your name, email, phone (if given) and message through the contact form.</li>
            </ul>

            <h2>How we use it</h2>
            <ul>
                <li>To create and secure your account and verify your email</li>
                <li>To process, deliver and track your orders</li>
                <li>To email you order confirmations, payment receipts and status updates</li>
                <li>To respond to your questions and resolve problems</li>
                <li>To prevent fraud and misuse of offers such as the student discount</li>
            </ul>

            <h2>Payments</h2>
            <p>
                Online payments are handled by Razorpay. Your card, UPI or bank details go directly to Razorpay and are not
                stored on our servers. Razorpay's own privacy policy applies to that information. For Cash on Delivery orders,
                no payment details are collected online.
            </p>

            <h2>Who we share it with</h2>
            <p>We do not sell your personal information. We share it only as needed to run the store:</p>
            <ul>
                <li><strong>Razorpay</strong> to process online payments</li>
                <li><strong>Email service providers</strong> to send OTPs, order emails and replies to your messages</li>
                <li><strong>Hosting and database providers</strong> that store our website data securely</li>
                <li><strong>Delivery staff</strong>, who see your name, address and phone number to complete delivery</li>
                <li><strong>Authorities</strong>, where the law requires it</li>
            </ul>

            <h2>Cookies and browser storage</h2>
            <p>
                We don't use advertising or tracking cookies. Our site saves your cart and login session in your browser's local
                storage so that you stay signed in and your cart is still there when you come back. You can clear this at any
                time in your browser settings, or by logging out.
            </p>

            <h2>How long we keep it</h2>
            <p>
                We keep account and order information for as long as your account is active and as needed for accounts,
                tax and legal purposes. You can ask us to delete your account at any time.
            </p>

            <h2>Your choices</h2>
            <p>You can ask us to:</p>
            <ul>
                <li>Show you the personal information we hold about you</li>
                <li>Correct anything that is wrong or out of date</li>
                <li>Delete your account and personal information, where we aren't required to keep it</li>
            </ul>
            <p>
                Email <a href={`mailto:${STORE.email}`}>{STORE.email}</a> or use our <Link to="/contact">contact form</Link>.
                We'll respond within a reasonable time.
            </p>

            <h2>Security</h2>
            <p>
                We use reasonable safeguards, including hashed passwords and secure connections, to protect your information. No
                online service can be completely secure, so please choose a strong password and don't share it.
            </p>

            <h2>Changes to this policy</h2>
            <p>
                We may update this policy from time to time. The "last updated" date above shows when it last changed.
            </p>

            <h2>Contact</h2>
            <p>
                {STORE.name}, {STORE.address}.<br />
                Email: <a href={`mailto:${STORE.email}`}>{STORE.email}</a> · Phone: <a href={STORE.phoneHref}>{STORE.phone}</a>
            </p>
        </InfoPage>
    );
};

export default Privacy;
